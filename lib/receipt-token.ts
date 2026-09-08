import { createHmac, timingSafeEqual } from "node:crypto";

type ReceiptTokenPurpose = "upload" | "download";

type ReceiptTokenContext = {
  eventId?: string;
};

export type ReceiptTokenPayload = {
  id: string;
  purpose: ReceiptTokenPurpose;
  exp: number;
  eventId?: string;
};

const getSecret = () => {
  const secret = process.env.RECEIPT_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("RECEIPT_SIGNING_SECRET must contain at least 32 characters");
  }
  return secret;
};

const signatureFor = (payload: string) =>
  createHmac("sha256", getSecret()).update(payload).digest("base64url");

export const createReceiptToken = (
  id: string,
  purpose: ReceiptTokenPurpose,
  lifetimeSeconds: number,
  context: ReceiptTokenContext = {},
) => {
  const payloadData: ReceiptTokenPayload = {
    id,
    purpose,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  };
  if (context.eventId) payloadData.eventId = context.eventId;

  const payload = Buffer.from(JSON.stringify({
    ...payloadData,
  })).toString("base64url");

  return `${payload}.${signatureFor(payload)}`;
};

export const readReceiptToken = (
  token: string,
  expectedId: string,
  expectedPurpose: ReceiptTokenPurpose,
): ReceiptTokenPayload | null => {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expectedSignature = signatureFor(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReceiptTokenPayload;
    return parsed.id === expectedId
      && parsed.purpose === expectedPurpose
      && Number.isInteger(parsed.exp)
      && parsed.exp > Math.floor(Date.now() / 1000)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

export const verifyReceiptToken = (
  token: string,
  expectedId: string,
  expectedPurpose: ReceiptTokenPurpose,
) => Boolean(readReceiptToken(token, expectedId, expectedPurpose));
