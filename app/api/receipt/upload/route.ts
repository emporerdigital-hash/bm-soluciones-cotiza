import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { createReceiptToken, readReceiptToken } from "@/lib/receipt-token";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const validId = (value: string) => /^[a-zA-Z0-9_-]{8,160}$/.test(value);
const objectKey = (id: string) => `receipts/${id}`;
const cleanFileName = (value: string) => value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "recibo-cfe";

const getSiteOrigin = (request: Request) => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    return new URL(configured || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
};

const notifyReceiptUploaded = async (
  request: Request,
  id: string,
  eventId: string,
  fileName: string,
  blobContentType: string,
) => {
  const webhook = process.env.MAKE_WEBHOOK_URL;
  if (!webhook) {
    console.error("missing_make_webhook_url_for_receipt", id);
    return;
  }

  try {
    new URL(webhook);
  } catch {
    console.error("invalid_make_webhook_url_for_receipt", id);
    return;
  }

  let contentType = blobContentType;
  let size = 0;
  let uploadedAt = new Date().toISOString();
  try {
    const metadata = await head(objectKey(id));
    contentType = metadata.contentType || contentType;
    size = metadata.size;
    uploadedAt = metadata.uploadedAt.toISOString();
  } catch (error) {
    // The object is already confirmed by Blob's completion callback. If a
    // metadata lookup is temporarily unavailable, still notify Make with the
    // safe fields we received from Blob so the CRM status is not lost.
    console.error("receipt_metadata_lookup_failed", id, error);
  }

  const downloadToken = createReceiptToken(id, "download", 90 * 24 * 60 * 60);
  const origin = getSiteOrigin(request);
  const receiptUrl = `${origin}/api/receipt?id=${encodeURIComponent(id)}&token=${encodeURIComponent(downloadToken)}`;
  const payload = {
    source: "bm_soluciones_quote_form",
    eventName: "ReceiptUploaded",
    eventId: `receipt_${id}`,
    leadEventId: eventId,
    upsertKey: eventId.replace(/^lead_/, "") || id,
    deduplicationKey: `receipt:${id}`,
    receiptExpected: true,
    receiptStatus: "received",
    receiptUrl,
    receipt: {
      received: true,
      status: "received",
      id,
      fileName: cleanFileName(fileName),
      contentType,
      size,
      url: receiptUrl,
      uploadedAt,
    },
    crmStatus: "Expediente completo",
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Webhook ${response.status}`);
      console.log("receipt_update_delivered", id, response.status);
      return;
    } catch (error) {
      if (attempt === 3) {
        console.error("receipt_update_failed", id, error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = JSON.parse(clientPayload || "{}") as { id?: string; token?: string; fileName?: string };
        const id = typeof parsed.id === "string" ? parsed.id : "";
        const token = typeof parsed.token === "string" ? parsed.token : "";
        const tokenPayload = readReceiptToken(token, id, "upload");

        if (!validId(id)
          || pathname !== `receipts/${id}`
          || !tokenPayload) {
          throw new Error("Unauthorized receipt upload");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          // A visitor may retry after a dropped response. This token is scoped
          // to one receipt id, so replacing only that private object is safe.
          allowOverwrite: true,
          tokenPayload: JSON.stringify({
            id,
            eventId: tokenPayload.eventId || "",
            fileName: typeof parsed.fileName === "string" ? cleanFileName(parsed.fileName) : "recibo-cfe",
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsed = JSON.parse(tokenPayload || "{}") as { id?: string; eventId?: string; fileName?: string };
        if (!parsed.id || !validId(parsed.id)) {
          console.error("receipt_uploaded_without_valid_id");
          return;
        }
        console.log("receipt_uploaded", parsed.id);
        if (parsed.eventId) {
          await notifyReceiptUploaded(request, parsed.id, parsed.eventId, parsed.fileName || "recibo-cfe", blob.contentType);
        } else {
          // Tokens issued before this update remain valid for the upload, but
          // cannot safely identify which CRM row should receive the update.
          console.warn("receipt_uploaded_without_lead_event", parsed.id);
        }
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("receipt_upload_authorization_failed", error);
    return NextResponse.json({ error: "receipt_upload_not_authorized" }, { status: 400 });
  }
}
