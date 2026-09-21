import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createHmac } from "node:crypto";

// Never print tokens, secrets, signatures, raw provider responses, or guest data.
const env = parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8"));
for (const [name, value] of Object.entries(env)) {
  if (!/^(META_|N8N_|NEXT_PUBLIC_APP_URL|VERCEL_)/.test(name)) continue;
  console.log(
    JSON.stringify({
      name,
      present: Boolean(value),
      length: value.length,
      outerWhitespace: value !== value.trim(),
      hex32:
        name === "META_APP_SECRET" ? /^[a-f0-9]{32}$/i.test(value) : undefined,
      value:
        /^(META_GRAPH_API_VERSION|META_APP_ID|META_INSTAGRAM_ACCOUNT_ID|NEXT_PUBLIC_APP_URL)$/.test(
          name,
        )
          ? value
          : undefined,
    }),
  );
}
if (process.argv.includes("--vercel")) {
  await inspectVercel();
  process.exit(0);
}
if (process.argv.includes("--meta-app")) {
  const headers = { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` };
  const subscriptions = await check(
    "account_app_ids",
    `https://graph.instagram.com/${env.META_GRAPH_API_VERSION}/${env.META_INSTAGRAM_ACCOUNT_ID}/subscribed_apps`,
    { headers },
    (data) => ({
      apps: data?.data?.map((app) => app.id),
    }),
  );
  const ids = new Set([
    env.META_APP_ID,
    ...(subscriptions?.data?.data || []).map((app) => app.id),
  ]);
  for (const id of ids) {
    if (!/^\d+$/.test(id)) continue;
    const appSecret =
      id === env.META_APP_ID
        ? env.META_BASIC_APP_SECRET || env.META_APP_SECRET
        : env.META_INSTAGRAM_APP_SECRET || env.META_APP_SECRET;
    await check(
      `app_subscription_config_${id}`,
      `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${id}/subscriptions`,
      {
        headers: { Authorization: `Bearer ${id}|${appSecret}` },
      },
      (data) => ({
        subscriptions: data?.data?.map((item) => ({
          object: item.object,
          active: item.active,
          callback: item.callback_url
            ? new URL(item.callback_url).origin +
              new URL(item.callback_url).pathname
            : undefined,
          fields: item.fields?.map((field) => field.name),
        })),
      }),
    );
  }
  process.exit(0);
}
if (!process.argv.includes("--live")) process.exit(0);

async function inspectVercel() {
  if (!env.VERCEL_TOKEN)
    throw new Error("Add VERCEL_TOKEN to the ignored local .env first.");
  const originIndex = process.argv.indexOf("--origin");
  const origin = new URL(
    originIndex >= 0 ? process.argv[originIndex + 1] : env.NEXT_PUBLIC_APP_URL,
  );
  if (origin.protocol !== "https:")
    throw new Error("Specify the production HTTPS origin.");
  async function api(path, teamId, options = {}) {
    const url = new URL(path, "https://api.vercel.com");
    if (teamId) url.searchParams.set("teamId", teamId);
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    return { status: response.status, data: await response.json() };
  }
  const teams = await api("/v2/teams?limit=100");
  const scopes = [
    undefined,
    ...(teams.data.teams || []).map((team) => team.id),
  ];
  for (const scope of scopes) {
    const alias = await api(
      `/v4/aliases/${encodeURIComponent(origin.hostname)}`,
      scope,
    );
    if (alias.status !== 200 || !alias.data.projectId) continue;
    const { projectId, deploymentId } = alias.data;
    const deployment = await api(`/v13/deployments/${deploymentId}`, scope);
    console.log(
      JSON.stringify({
        check: "vercel_active_deployment",
        projectId,
        deploymentId,
        teamId: scope,
        status: deployment.status,
        createdAt: deployment.data.createdAt,
        state: deployment.data.readyState,
        commit: deployment.data.meta?.githubCommitSha,
      }),
    );
    const config = await api(`/v10/projects/${projectId}/env`, scope);
    const variables = Array.isArray(config.data)
      ? config.data
      : config.data.envs;
    if (!Array.isArray(variables))
      throw new Error("Could not read project environment metadata.");
    if (process.argv.includes("--sync-signing")) {
      const keys = ["META_INSTAGRAM_APP_SECRET", "META_BASIC_APP_SECRET"];
      if (!keys.every((key) => /^[a-f0-9]{32}$/i.test(env[key] || "")))
        throw new Error(
          "Both explicit app secrets must be saved locally before syncing.",
        );
      for (const key of keys) {
        const existing = variables.find(
          (item) =>
            item.key === key && [item.target].flat().includes("production"),
        );
        const result = await api(
          existing
            ? `/v9/projects/${projectId}/env/${existing.id}`
            : `/v10/projects/${projectId}/env`,
          scope,
          {
            method: existing ? "PATCH" : "POST",
            body: JSON.stringify({
              key,
              value: env[key],
              type: "sensitive",
              target: existing?.target || ["production"],
            }),
          },
        );
        console.log(
          JSON.stringify({
            check: "vercel_sync_signing",
            key,
            status: result.status,
          }),
        );
        if (result.status < 200 || result.status >= 300)
          throw new Error("Signing configuration update failed.");
      }
      return;
    }
    for (const variable of variables) {
      if (!/^(META_|N8N_|NEXT_PUBLIC_APP_URL$)/.test(variable.key)) continue;
      if (![variable.target].flat().includes("production")) continue;
      const result = await api(
        `/v1/projects/${projectId}/env/${variable.id}`,
        scope,
      );
      const value = result.data.value;
      const readable =
        result.status === 200 &&
        typeof value === "string" &&
        result.data.decrypted === true;
      console.log(
        JSON.stringify({
          check: "vercel_production_variable",
          name: variable.key,
          updatedAt: variable.updatedAt,
          type: variable.type,
          readable,
          status: result.status,
          matchesLocal: readable ? value === env[variable.key] : undefined,
          outerWhitespace: readable ? value !== value.trim() : undefined,
          length: readable ? value.length : undefined,
          changedAfterDeployment:
            typeof variable.updatedAt === "number" &&
            variable.updatedAt > deployment.data.createdAt,
        }),
      );
      if (readable && variable.key === "META_APP_SECRET") {
        const body = '{"object":"instagram","entry":[]}';
        await check(
          "production_signed_with_vercel_project_secret",
          new URL("/api/webhooks/meta", origin),
          {
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/json",
              "X-Hub-Signature-256": `sha256=${createHmac("sha256", value).update(body).digest("hex")}`,
            },
          },
          (data) => ({ received: data?.received === true }),
        );
      }
    }
    return;
  }
  throw new Error(
    "The Vercel token cannot access the project behind this production domain.",
  );
}

async function check(label, url, options, summarize) {
  try {
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      data = null;
    }
    console.log(
      JSON.stringify({
        check: label,
        status: response.status,
        ...summarize(data),
        error:
          data?.error && typeof data.error === "object"
            ? {
                type: data.error.type,
                code: data.error.code,
                subcode: data.error.error_subcode,
                trace: data.error.fbtrace_id,
                message:
                  typeof data.error.message === "string"
                    ? Object.values(env)
                        .filter((value) => value.length > 6)
                        .reduce(
                          (message, value) =>
                            message.replaceAll(value, "[redacted]"),
                          data.error.message,
                        )
                        .slice(0, 400)
                    : undefined,
              }
            : undefined,
      }),
    );
    return { status: response.status, data };
  } catch (error) {
    console.log(
      JSON.stringify({
        check: label,
        networkError: error.name,
        code: error.cause?.code,
      }),
    );
    process.exitCode = 1;
  }
}

const originIndex = process.argv.indexOf("--origin");
const origin = new URL(
  originIndex >= 0 ? process.argv[originIndex + 1] : env.NEXT_PUBLIC_APP_URL,
);
if (origin.protocol !== "https:")
  throw new Error("Live check requires an HTTPS application URL.");
const raw = '{"object":"instagram","entry":[]}';
const explicitKeys = [
  "META_INSTAGRAM_APP_SECRET",
  "META_BASIC_APP_SECRET",
].filter((key) => env[key]);
for (const key of explicitKeys.length ? explicitKeys : ["META_APP_SECRET"]) {
  await check(
    `production_signed_empty_event_${key}`,
    new URL("/api/webhooks/meta", origin),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${createHmac("sha256", env[key]).update(raw).digest("hex")}`,
      },
      body: raw,
    },
    (data) => ({ received: data?.received === true }),
  );
}

await check(
  "production_internal_auth_only",
  new URL("/api/internal/instagram/events", origin),
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Promotr-Secret": env.N8N_SHARED_SECRET,
    },
    body: "{}",
  },
  (data) => ({ reachedEventValidation: data?.error === "Invalid event" }),
);

const workflowUrl = new URL(env.N8N_INSTAGRAM_WEBHOOK_URL);
console.log(
  JSON.stringify({
    check: "n8n_url",
    host: workflowUrl.host,
    productionPath: workflowUrl.pathname.startsWith("/webhook/"),
  }),
);
if (workflowUrl.protocol !== "https:")
  throw new Error("Live n8n check requires HTTPS.");
await check(
  "n8n_invalid_event_probe",
  workflowUrl,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Promotr-Secret": env.N8N_SHARED_SECRET,
    },
    body: "{}",
  },
  (data) => ({ reachedEventValidation: data?.error === "Invalid event" }),
);

const version = env.META_GRAPH_API_VERSION;
if (!/^v\d+\.\d+$/.test(version))
  throw new Error("Invalid configured Meta API version.");
const headers = { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` };
await check(
  "instagram_token_identity",
  `https://graph.instagram.com/${version}/me?fields=id,user_id,username`,
  { headers },
  (data) => ({
    id: data?.id,
    userId: data?.user_id,
    username: data?.username,
    configuredAccountMatches: Boolean(
      data &&
      [data.id, data.user_id]
        .map(String)
        .includes(env.META_INSTAGRAM_ACCOUNT_ID),
    ),
  }),
);
if (!/^\d+$/.test(env.META_INSTAGRAM_ACCOUNT_ID))
  throw new Error("Invalid Instagram account ID.");
await check(
  "instagram_account_subscriptions",
  `https://graph.instagram.com/${version}/${env.META_INSTAGRAM_ACCOUNT_ID}/subscribed_apps`,
  { headers },
  (data) => ({
    subscriptions: Array.isArray(data?.data)
      ? data.data.map((app) => ({
          id: app.id,
          name: app.name,
          fields: app.subscribed_fields,
        }))
      : undefined,
  }),
);
