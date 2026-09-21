import "server-only";

type InstagramSendResult = { messageId: string };

export async function sendInstagramMessage(input: {
  recipientId: string;
  text: string;
}): Promise<InstagramSendResult> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const token = process.env.META_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION;
  if (!accountId || !token || !/^v\d+\.\d+$/.test(version || ""))
    throw new Error("Instagram delivery is not configured.");
  if (!/^\d+$/.test(input.recipientId) || !input.text.trim())
    throw new Error("Invalid Instagram recipient or message.");

  const response = await fetch(
    `https://graph.instagram.com/${version}/${accountId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: input.recipientId },
        message: { text: input.text },
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    console.error("Instagram Send API rejected a message", {
      status: response.status,
    });
    throw new Error("Instagram did not accept the message.");
  }
  const result = (await response.json()) as { message_id?: unknown };
  if (typeof result.message_id !== "string" || !result.message_id)
    throw new Error("Instagram did not return a message ID.");
  return { messageId: result.message_id };
}
