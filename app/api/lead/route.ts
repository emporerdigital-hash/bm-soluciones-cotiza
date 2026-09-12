import { after } from "next/server";
import { createReceiptToken } from "@/lib/receipt-token";

export const runtime = "nodejs";
export const maxDuration = 15;

const BILL_RANGES: Record<string, string> = {
  "Menos de $2,000": "under_2000",
  "$2,000 a $5,000": "2000_4999",
  "$2,000 a $4,999": "2000_4999",
  "$5,000 a $10,000": "5000_9999",
  "$5,000 a $9,999": "5000_9999",
  "Más de $10,000": "10000_plus",
  "$10,000 a $19,999": "10000_19999",
  "Más de $20,000": "20000_plus",
};

const TIMEFRAMES: Record<string, string> = {
  "Lo antes posible": "asap",
  "En 1 a 3 meses": "1_3_months",
  "En 3 a 6 meses": "3_6_months",
  "Solo estoy investigando": "exploring",
};

type ReceiptMeta = {
  received?: boolean;
  id?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
};

type LeadInput = {
  formVariant?: string;
  bill?: string;
  property?: string;
  timing?: string;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  eventId?: string;
  pageUrl?: string;
  referrer?: string;
  receiptMeta?: ReceiptMeta;
  testMode?: boolean;
};

const asText = (value: unknown, maxLength = 256) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const normalize = (value: string) => value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim().toLowerCase();
const sha256 = async (value: string) => {
  const normalized = normalize(value);
  if (!normalized) return "";
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const digits = (value: string) => value.replace(/\D/g, "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECEIPT_SIZE = 20 * 1024 * 1024;
const RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const readCookie = (header: string, name: string) => {
  const raw = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const parseName = (fullName: string) => {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

async function readInput(request: Request): Promise<LeadInput> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("unsupported_content_type");
  }
  return await request.json() as LeadInput;
}

export async function POST(request: Request) {
  try {
    const raw = await readInput(request);
    const requestUrl = new URL(request.url);
    const isFlatForm = asText(raw.formVariant, 32) === "flat";
    const name = asText(raw.name);
    const { firstName, lastName } = parseName(name);
    const phone = digits(asText(raw.phone, 32)).slice(-10);
    const phoneE164 = phone ? `52${phone}` : "";
    const email = asText(raw.email, 320).toLowerCase();
    const decodeHeader = (name: string, maxLength = 100) => {
      const value = request.headers.get(name) || "";
      try { return asText(decodeURIComponent(value), maxLength); } catch { return asText(value, maxLength); }
    };
    const city = asText(raw.city, 100) || decodeHeader("x-vercel-ip-city");
    const municipality = city;
    const regionCode = decodeHeader("x-vercel-ip-country-region", 20).toLowerCase();
    const state = regionCode || "jalisco";
    const postalCode = decodeHeader("x-vercel-ip-postal-code", 20);
    const countryCode = (decodeHeader("x-vercel-ip-country", 8) || "mx").toLowerCase();
    const countryName = countryCode === "mx" ? "México" : countryCode.toUpperCase();
    const billRange = BILL_RANGES[asText(raw.bill)] || "";
    const timeframe = TIMEFRAMES[asText(raw.timing)] || "";
    const propertyType = "not_collected";
    const receiptMeta = raw.receiptMeta && typeof raw.receiptMeta === "object" ? raw.receiptMeta : null;
    const receiptReceived = false;
    const requestedReceiptId = asText(receiptMeta?.id, 160);
    const receiptFileName = asText(receiptMeta?.fileName, 260);
    const receiptContentType = asText(receiptMeta?.contentType, 120).toLowerCase();
    const receiptSize = Number(receiptMeta?.size || 0);
    const receiptMetadataInvalid = isFlatForm && (
      !/^[a-zA-Z0-9_-]{8,160}$/.test(requestedReceiptId)
      || !receiptFileName
      || !RECEIPT_TYPES.has(receiptContentType)
      || !Number.isFinite(receiptSize)
      || receiptSize <= 0
      || receiptSize > MAX_RECEIPT_SIZE
    );

    const invalid = !firstName
      || phone.length !== 10
      || !emailPattern.test(email)
      || receiptMetadataInvalid
      || !billRange
      || billRange === "under_2000"
      || !timeframe
      || (isFlatForm && timeframe === "exploring");

    if (invalid) {
      return Response.json({ ok: false, error: "invalid_lead_data" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const requestedEventId = asText(raw.eventId, 160);
    const uuid = requestedEventId.replace(/^lead_/, "") || crypto.randomUUID();
    const eventId = `lead_${uuid}`;
    const receiptId = /^[a-zA-Z0-9_-]{8,160}$/.test(requestedReceiptId) ? requestedReceiptId : crypto.randomUUID();

    // Internal QA can validate the complete form at ?test=1 without creating
    // a CRM record or teaching Meta that a staff submission is a real lead.
    if (raw.testMode === true) {
      return Response.json({ ok: true, eventId, receiptId, receiptUploadToken: "test", test: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    const webhook = process.env.MAKE_WEBHOOK_URL;
    if (!webhook) {
      console.error("missing_make_webhook_url");
      return Response.json({ ok: false, error: "lead_service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    try {
      new URL(webhook);
    } catch {
      console.error("invalid_make_webhook_url");
      return Response.json({ ok: false, error: "lead_service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const sourceUrl = asText(raw.pageUrl, 2048) || asText(request.headers.get("referer"), 2048) || requestUrl.origin;
    let source: URL;
    try {
      source = new URL(sourceUrl);
    } catch {
      source = new URL(requestUrl.origin);
    }

    const params = source.searchParams;
    const cookies = request.headers.get("cookie") || "";
    const fbp = readCookie(cookies, "_fbp");
    const fbclid = params.get("fbclid") || "";
    const fbc = readCookie(cookies, "_fbc") || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : "");
    const testEventCode = asText(params.get("test_event_code"), 160);
    const clientIpAddress = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const clientUserAgent = request.headers.get("user-agent") || "";

    const [em, ph, fn, ln, ct, st, zp, country, externalId] = await Promise.all([
      email ? sha256(email) : "",
      sha256(phoneE164),
      sha256(firstName),
      lastName ? sha256(lastName) : "",
      city ? sha256(city) : "",
      state ? sha256(state) : "",
      postalCode ? sha256(postalCode) : "",
      sha256(countryCode),
      sha256(uuid),
    ]);

    const calculatedLeadScore = Math.min(100,
      (billRange === "20000_plus" ? 50 : billRange === "10000_19999" ? 45 : billRange === "5000_9999" ? 40 : 30)
      + (timeframe === "asap" ? 30 : timeframe === "1_3_months" ? 25 : 15)
      + 20,
    );
    const leadScore = isFlatForm ? Math.max(70, calculatedLeadScore) : calculatedLeadScore;
    const qualified = isFlatForm || leadScore >= 70;
    const priority = qualified ? "quote_now" : leadScore >= 50 ? "warm" : "nurture";

    // Bind the private upload permission to this lead. The browser receives
    // only a short-lived token for this one receipt id.
    const receiptUploadToken = createReceiptToken(receiptId, "upload", 2 * 60 * 60, { eventId });
    const receipt = {
      received: receiptReceived,
      status: "pending",
      id: receiptId,
      fileName: receiptFileName,
      contentType: receiptContentType,
      size: receiptSize,
      url: "",
    };

    const tracking = {
      externalId: uuid,
      eventSourceUrl: sourceUrl,
      referrer: asText(raw.referrer, 2048),
      userAgent: clientUserAgent,
      fbp,
      fbc,
      fbclid,
      campaignId: params.get("utm_id") || params.get("campaign_id") || "",
      adsetId: params.get("adset_id") || "",
      adId: params.get("ad_id") || "",
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmContent: params.get("utm_content") || "",
      utmTerm: params.get("utm_term") || "",
      testEventCode,
      formVariant: isFlatForm ? "flat" : "standard",
    };

    const metaMatch = {
      normalization: "meta_sha256_v1",
      em,
      ph,
      fn,
      ln,
      ct,
      st,
      zp,
      country,
      external_id: externalId,
      client_ip_address: clientIpAddress,
      client_user_agent: clientUserAgent,
      fbp,
      fbc,
    };

    const payload = {
      source: "bm_soluciones_quote_form",
      eventName: "Lead",
      eventId,
      qualifiedEventName: !isFlatForm && qualified ? "QualifiedLead" : "",
      qualifiedEventId: !isFlatForm && qualified ? `qualified_${uuid}` : "",
      eventTime,
      testEventCode,
      upsertKey: uuid,
      deduplicationKey: `lead:${uuid}`,
      contact: {
        name,
        firstName,
        lastName,
        phone,
        phoneE164,
        email,
        company: "No especificado",
        preferredContactTime: "any",
      },
      answers: {
        propertyType,
        billRange,
        decisionAuthority: "not_collected",
        timeframe,
        paymentPreference: "not_collected",
        roofType: "not_collected",
        municipality,
        city,
        state,
        regionCode,
        postalCode,
        country: countryName,
        countryCode,
      },
      receiptExpected: true,
      receiptStatus: "pending",
      receiptUrl: "",
      leadScore,
      qualified,
      quoteReady: true,
      priority,
      crmStatus: receiptReceived ? "Expediente completo" : "Recibo pendiente",
      tracking,
      receipt,
      server: {
        receivedAt: new Date().toISOString(),
        clientIpAddress,
        clientUserAgent,
      },
      metaMatch,
      capi: {
        event_name: "Lead",
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl,
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
        user_data: {
          em: em ? [em] : [],
          ph: [ph],
          fn: [fn],
          ln: ln ? [ln] : [],
          ct: ct ? [ct] : [],
          st: st ? [st] : [],
          zp: zp ? [zp] : [],
          country: [country],
          external_id: [externalId],
          client_ip_address: clientIpAddress,
          client_user_agent: clientUserAgent,
          fbp,
          fbc,
        },
        custom_data: {
          content_name: "Cotización solar BM Soluciones",
          content_category: propertyType,
          currency: "MXN",
          lead_id: eventId,
          lead_score: leadScore,
          receipt_uploaded: receiptReceived,
          qualified,
          quote_ready: true,
        },
      },
    };

    after(async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const response = await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error(`Webhook ${response.status}`);
          console.log("lead_delivered", eventId, response.status);
          return;
        } catch (error) {
          if (attempt === 3) {
            console.error("lead_delivery_failed", eventId, error);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    });

    return Response.json({ ok: true, eventId, receiptId, receiptUploadToken }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("lead_submission_failed", error);
    return Response.json({ ok: false, error: "lead_submission_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
