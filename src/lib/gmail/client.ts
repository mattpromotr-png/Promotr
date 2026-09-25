import "server-only";

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

export type GmailHeader = { name: string; value: string };
export type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};

function oauthConfiguration() {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!clientId || !clientSecret || !appUrl)
    throw new Error("Gmail OAuth is not configured.");
  return {
    clientId,
    clientSecret,
    redirectUri: new URL("/api/integrations/gmail/callback", appUrl).toString(),
  };
}

export function gmailAuthorizationUrl(state: string) {
  const config = oauthConfiguration();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.modify");
  url.searchParams.set("state", state);
  const expected = process.env.GMAIL_EXPECTED_ADDRESS?.trim();
  if (expected) url.searchParams.set("login_hint", expected);
  return url.toString();
}

export async function exchangeGmailCode(code: string): Promise<OAuthTokens> {
  const config = oauthConfiguration();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Google authorization could not be completed.");
  return (await response.json()) as OAuthTokens;
}

export async function refreshGmailAccessToken(refreshToken: string) {
  const config = oauthConfiguration();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Gmail authorization has expired or was revoked.");
  return ((await response.json()) as OAuthTokens).access_token;
}

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`Gmail API request failed (${response.status}).`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return (await response.json()) as T;
}

export function getGmailProfile(accessToken: string) {
  return gmailFetch<{ emailAddress: string; historyId: string }>(
    accessToken,
    "/users/me/profile",
  );
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  try {
    return await gmailFetch<GmailMessage>(
      accessToken,
      `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    );
  } catch (error) {
    // A message can disappear between Gmail's history listing and retrieval.
    if (error instanceof Error && "status" in error && error.status === 404)
      return null;
    throw error;
  }
}

export async function listGmailHistory(
  accessToken: string,
  startHistoryId: string,
) {
  const messageIds = new Set<string>();
  let pageToken: string | undefined;
  let historyId = startHistoryId;
  do {
    const params = new URLSearchParams({
      startHistoryId,
      historyTypes: "messageAdded",
      maxResults: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gmailFetch<{
      historyId?: string;
      nextPageToken?: string;
      history?: Array<{
        messagesAdded?: Array<{ message?: { id?: string } }>;
      }>;
    }>(accessToken, `/users/me/history?${params}`);
    for (const item of page.history || [])
      for (const added of item.messagesAdded || [])
        if (added.message?.id) messageIds.add(added.message.id);
    historyId = page.historyId || historyId;
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { messageIds: [...messageIds], historyId };
}

export function startGmailWatch(accessToken: string) {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  if (!topicName) return null;
  return gmailFetch<{ historyId: string; expiration: string }>(
    accessToken,
    "/users/me/watch",
    {
      method: "POST",
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
      }),
    },
  );
}

export function sendGmailMessage(
  accessToken: string,
  input: { raw: string; threadId?: string },
) {
  return gmailFetch<{ id: string; threadId: string }>(
    accessToken,
    "/users/me/messages/send",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function gmailHeader(message: GmailMessage, name: string) {
  return message.payload?.headers?.find(
    (header) => header.name.toLowerCase() === name.toLowerCase(),
  )?.value;
}

export function gmailText(message: GmailMessage) {
  const plain = findBody(message.payload, "text/plain");
  if (plain) return decodeBase64Url(plain).trim().slice(0, 12000);
  const html = findBody(message.payload, "text/html");
  return html ? stripHtml(decodeBase64Url(html)).trim().slice(0, 12000) : "";
}

function findBody(
  part: GmailPart | undefined,
  mimeType: string,
): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part.body.data;
  for (const child of part.parts || []) {
    const value = findBody(child, mimeType);
    if (value) return value;
  }
  return null;
}

export function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
