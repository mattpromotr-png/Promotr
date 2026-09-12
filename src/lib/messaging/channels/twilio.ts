import "server-only";

import twilio from "twilio";

type TwilioConfiguration = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
  from: string;
  messagingServiceSid?: string;
};

export function getTwilioConfiguration(): TwilioConfiguration | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!accountSid || !apiKeySid || !apiKeySecret || !authToken || !from)
    return null;
  return {
    accountSid,
    apiKeySid,
    apiKeySecret,
    authToken,
    from,
    messagingServiceSid,
  };
}

export function normalizeSmsPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15)
    return `+${digits}`;
  return null;
}

export function validateTwilioRequest(
  signature: string,
  url: string,
  params: Record<string, string>,
) {
  const config = getTwilioConfiguration();
  return Boolean(
    config &&
    signature &&
    twilio.validateRequest(config.authToken, signature, url, params),
  );
}

export async function sendTwilioSms(input: {
  to: string;
  body: string;
  statusCallback: string;
}) {
  const config = getTwilioConfiguration();
  if (!config) return { configured: false as const };
  const client = twilio(config.apiKeySid, config.apiKeySecret, {
    accountSid: config.accountSid,
  });
  const message = await client.messages.create({
    to: input.to,
    body: input.body,
    statusCallback: input.statusCallback,
    ...(config.messagingServiceSid
      ? { messagingServiceSid: config.messagingServiceSid }
      : { from: config.from }),
  });
  return {
    configured: true as const,
    sid: message.sid,
    status: message.status,
  };
}
