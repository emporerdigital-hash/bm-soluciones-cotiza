import { after } from "next/server";
import { createReceiptToken } from "@/lib/receipt-token";

export const runtime = "nodejs";
export const maxDuration = 15;

const BILL_RANGES: Record<string, string> = {
  "Menos de $2,000": "under_2000",
  "$2,000 a $4,999": "2000_4999",
  "$5,000 a $9,999": "5000_9999",
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
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalize(value))))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
const digits = (value: string) => value.replace(/\D/g, "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const name = asText(raw.name);
    const { firstName, lastName } = parseName(name);
    const phone = digits(asText(raw.phone, 32)).slice(-10);
    const phoneE164 = phone ? `52${phone}` : "";
    const email = asText(raw.email, 320).toLowerCase();
    const city = asText(raw.city, 100);
    const state = "Jalisco";
    const billRange = BILL_RANGES[asText(raw.bill)] || "";
    const timeframe = TIMEFRAMES[asText(raw.timing)] || "";
    const propertyType = raw.property === "En mi casa" ? "home" : raw.property === "En mi negocio" ? "business" : "";
    const receiptMeta = raw.receiptMeta && typeof raw.receiptMeta === "object" ? raw.receiptMeta : null;
    const receiptReceived = false;

    const invalid = !firstName
      || !lastName
      || phone.length !== 10
      || !emailPattern.test(email)
      || city.length < 2
      || !propertyType
      || !billRange
      || billRange === "under_2000"
      || !timeframe
      || timeframe === "exploring";

    if (invalid) {
      return Response.json({ ok: false, error: "invalid_lead_data" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const requestedEventId = asText(raw.eventId, 160);
    const uuid = requestedEventId.replace(/^lead_/, "") || crypto.randomUUID();
    const eventId = `lead_${uuid}`;

    // Internal QA can validate the complete form at ?test=1 without creating
    // a CRM record or teaching Meta that a staff submission is a real lead.
    if (raw.testMode === true) {
      return Response.json({ ok: true, eventId, receiptUploadToken: "test", test: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
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
    const clientIpAddress = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const clientUserAgent = request.headers.get("user-agent") || "";

    const [em, ph, fn, ln, ct, st, country, externalId] = await Promise.all([
      sha256(email),
      sha256(phoneE164),
      sha256(firstName),
      sha256(lastName),
      sha256(city),
      sha256(state),
      sha256("mx"),
      sha256(uuid),
    ]);

    const leadScore = Math.min(100,
      (billRange === "20000_plus" ? 50 : billRange === "10000_19999" ? 45 : billRange === "5000_9999" ? 40 : 30)
      + (timeframe === "asap" ? 30 : timeframe === "1_3_months" ? 25 : 15)
      + 20,
    );
    const qualified = leadScore >= 70;
    const priority = qualified ? "quote_now" : leadScore >= 50 ? "warm" : "nurture";

    const requestedReceiptId = asText(receiptMeta?.id, 160);
    const receiptId = /^[a-zA-Z0-9_-]{8,160}$/.test(requestedReceiptId) ? requestedReceiptId : crypto.randomUUID();
    // Bind the upload permission to this lead. The file is optional and is
    // uploaded after the lead is accepted, so do not publish a download URL
    // until Vercel Blob confirms that the object exists.
    const receiptUploadToken = createReceiptToken(receiptId, "upload", 2 * 60 * 60, { eventId });
    const receipt = {
      received: receiptReceived,
      status: "pending",
      id: receiptId,
      fileName: asText(receiptMeta?.fileName, 260),
      contentType: asText(receiptMeta?.contentType, 120),
      size: Number(receiptMeta?.size || 0),
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
    };

    const metaMatch = {
      normalization: "meta_sha256_v1",
      em,
      ph,
      fn,
      ln,
      ct,
      st,
      zp: "",
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
      qualifiedEventName: qualified ? "QualifiedLead" : "",
      qualifiedEventId: qualified ? `qualified_${uuid}` : "",
      eventTime,
      upsertKey: uuid,
      deduplicationKey: `lead:${uuid}`,
      contact: {
        name,
        firstName,
        lastName,
        phone,
        phoneE164,
        email,
        company: propertyType === "home" ? "Particular" : "Negocio",
        preferredContactTime: "any",
      },
      answers: {
        propertyType,
        billRange,
        decisionAuthority: "not_collected",
        timeframe,
        paymentPreference: "not_collected",
        roofType: "not_collected",
        city,
        state,
        postalCode: "",
        country: "México",
        countryCode: "mx",
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
        user_data: {
          em: [em],
          ph: [ph],
          fn: [fn],
          ln: [ln],
          ct: [ct],
          st: [st],
          zp: [],
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
