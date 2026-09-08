import { get } from "@vercel/blob";
import { verifyReceiptToken } from "@/lib/receipt-token";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const validId = (value: string) => /^[a-zA-Z0-9_-]{8,160}$/.test(value);
const objectKey = (id: string) => `receipts/${id}`;
const cleanFileName = (value: string) => value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "recibo-cfe";
const typeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  pdf: "application/pdf",
};

// This endpoint exists only so ?test=1 can verify the file picker without
// writing a real customer document to storage.
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const declaredType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const contentLength = Number(request.headers.get("content-length") || 0);
    const rawFileName = request.headers.get("x-file-name") || "recibo-cfe";
    let decodedFileName = rawFileName;
    try {
      decodedFileName = decodeURIComponent(rawFileName);
    } catch {
      // The sanitized raw value remains usable.
    }
    const fileName = cleanFileName(decodedFileName);
    const fileExtension = fileName.toLowerCase().split(".").pop() || "";
    const contentType = declaredType && declaredType !== "application/octet-stream" ? declaredType : typeByExtension[fileExtension] || "";

    if (url.searchParams.get("test") !== "1"
      || !validId(id)
      || !ALLOWED_TYPES.has(contentType)
      || !request.body
      || contentLength > MAX_FILE_SIZE) {
      return Response.json({ ok: false, error: "invalid_receipt" }, { status: 400 });
    }

    await request.arrayBuffer();
    return Response.json({ ok: true, id, test: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("receipt_test_failed", error);
    return Response.json({ ok: false, error: "receipt_test_failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    if (!validId(id) || !verifyReceiptToken(token, id, "download")) {
      return new Response("Not found", { status: 404 });
    }

    const result = await get(objectKey(id), { access: "private" });
    if (!result || result.statusCode !== 200) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": "inline; filename=\"recibo-cfe\"",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error("receipt_fetch_failed", error);
    return new Response("Not found", { status: 404 });
  }
}
