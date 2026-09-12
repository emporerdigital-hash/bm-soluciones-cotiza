"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import styles from "./flat-lead-form.module.css";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

type LeadData = {
  name: string;
  phone: string;
  email: string;
  bill: string;
  timing: string;
};

type Field = keyof LeadData | "receipt";
type FormState = "editing" | "sending" | "upload-error" | "success";
type FlatLeadFormProps = { variant?: "landing" | "direct" };
type ReceiptCredentials = { eventId: string; receiptId: string; receiptUploadToken: string };

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1960665047853972";
const MAX_RECEIPT_SIZE = 20 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value = "") => value.replace(/\D/g, "");
const createId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const billOptions = [
  "Menos de $2,000",
  "$2,000 a $5,000",
  "$5,000 a $10,000",
  "Más de $10,000",
] as const;

const timingOptions = [
  "Lo antes posible",
  "En 1 a 3 meses",
  "En 3 a 6 meses",
  "Solo estoy investigando",
] as const;

const allowedReceiptTypes = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const receiptTypeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const getReceiptType = (file: File) => {
  if (allowedReceiptTypes.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split(".").pop() || "";
  return receiptTypeByExtension[extension] || "";
};

const initialData: LeadData = { name: "", phone: "", email: "", bill: "", timing: "" };

export function FlatLeadForm({ variant = "landing" }: FlatLeadFormProps) {
  const [data, setData] = useState<LeadData>(initialData);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [formState, setFormState] = useState<FormState>("editing");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const eventId = useRef("");
  const receiptId = useRef("");
  const receiptCredentials = useRef<ReceiptCredentials | null>(null);
  const submitLock = useRef(false);
  const formStarted = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const receiptInput = useRef<HTMLInputElement>(null);

  const isTestMode = () => {
    const value = new URLSearchParams(window.location.search).get("test");
    return value === "1" || value === "true";
  };

  const trackFormStart = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    if (isTestMode()) return;
    try { window.clarity?.("event", "FormStart"); } catch { /* Analytics must never block the form. */ }
    try { window.fbq?.("trackSingleCustom", META_PIXEL_ID, "FormStart"); } catch { /* Analytics must never block the form. */ }
  };

  const update = (field: keyof LeadData, value: string) => {
    trackFormStart();
    setServerError("");
    setErrors((current) => ({ ...current, [field]: undefined }));
    setData((current) => ({ ...current, [field]: value }));
  };

  const selectReceipt = (file: File | null) => {
    trackFormStart();
    setServerError("");
    setErrors((current) => ({ ...current, receipt: undefined }));

    if (!file) {
      setReceipt(null);
      return;
    }

    if (!getReceiptType(file)) {
      setReceipt(null);
      setErrors((current) => ({ ...current, receipt: "Sube una foto o PDF de tu recibo." }));
      if (receiptInput.current) receiptInput.current.value = "";
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setReceipt(null);
      setErrors((current) => ({ ...current, receipt: "El archivo debe pesar menos de 20 MB." }));
      if (receiptInput.current) receiptInput.current.value = "";
      return;
    }

    setReceipt(file);
  };

  const validate = () => {
    const nextErrors: Partial<Record<Field, string>> = {};
    if (data.name.trim().length < 2) nextErrors.name = "Escribe tu nombre.";
    if (digits(data.phone).length !== 10) nextErrors.phone = "Escribe un WhatsApp de 10 dígitos.";
    if (!emailPattern.test(data.email.trim())) nextErrors.email = "Escribe un correo válido.";
    if (!data.bill) nextErrors.bill = "Elige cuánto pagas por recibo.";
    if (!data.timing) nextErrors.timing = "Elige cuándo te gustaría instalar.";
    if (!receipt) nextErrors.receipt = "Sube una foto o PDF de tu recibo.";
    setErrors(nextErrors);

    if (nextErrors.name) {
      window.requestAnimationFrame(() => nameInput.current?.focus());
    } else if (nextErrors.phone) {
      window.requestAnimationFrame(() => phoneInput.current?.focus());
    } else if (nextErrors.email) {
      window.requestAnimationFrame(() => emailInput.current?.focus());
    } else if (nextErrors.bill) {
      window.requestAnimationFrame(() => document.getElementById("bm-flat-bill-group")?.focus());
    } else if (nextErrors.timing) {
      window.requestAnimationFrame(() => document.getElementById("bm-flat-timing-group")?.focus());
    } else if (nextErrors.receipt) {
      window.requestAnimationFrame(() => receiptInput.current?.focus());
    }

    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setData(initialData);
    setReceipt(null);
    setErrors({});
    setServerError("");
    setFormState("editing");
    submitLock.current = false;
    eventId.current = "";
    receiptId.current = "";
    receiptCredentials.current = null;
    if (receiptInput.current) receiptInput.current.value = "";
    window.requestAnimationFrame(() => nameInput.current?.focus());
  };

  const requestReceiptCredentials = async () => {
    if (!receipt) throw new Error("missing_receipt");
    if (!eventId.current) eventId.current = `lead_${createId()}`;
    if (!receiptId.current) receiptId.current = createId();

    const body = JSON.stringify({
      formVariant: "flat",
      name: data.name.trim(),
      phone: digits(data.phone),
      email: data.email.trim().toLowerCase(),
      bill: data.bill,
      timing: data.timing,
      eventId: eventId.current,
      pageUrl: window.location.href,
      referrer: document.referrer,
      receiptMeta: {
        received: false,
        id: receiptId.current,
        fileName: receipt.name,
        contentType: getReceiptType(receipt),
        size: receipt.size,
      },
      testMode: isTestMode(),
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (response.ok) {
          const result = await response.json() as Partial<ReceiptCredentials>;
          if (!result.eventId || !result.receiptId || !result.receiptUploadToken) throw new Error("invalid_receipt_credentials");
          return {
            eventId: result.eventId,
            receiptId: result.receiptId,
            receiptUploadToken: result.receiptUploadToken,
          };
        }
        if (response.status >= 400 && response.status < 500) break;
      } catch {
        // Retry with the same IDs so Make, Meta and Blob can deduplicate safely.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350 + attempt * 300));
    }

    throw new Error("lead_delivery_failed");
  };

  const uploadReceipt = async (credentials: ReceiptCredentials) => {
    if (!receipt) throw new Error("missing_receipt");
    const contentType = getReceiptType(receipt);

    if (isTestMode()) {
      const response = await fetch(`/api/receipt?id=${encodeURIComponent(credentials.receiptId)}&test=1`, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "X-File-Name": encodeURIComponent(receipt.name),
        },
        body: receipt,
      });
      if (!response.ok) throw new Error("test_receipt_upload_failed");
      return;
    }

    await upload(`receipts/${credentials.receiptId}`, receipt, {
      access: "private",
      contentType,
      handleUploadUrl: "/api/receipt/upload",
      clientPayload: JSON.stringify({
        id: credentials.receiptId,
        token: credentials.receiptUploadToken,
        fileName: receipt.name,
      }),
    });
  };

  const trackLead = () => {
    if (isTestMode()) return;
    try { window.clarity?.("event", "Lead"); } catch { /* Analytics must never block the confirmation. */ }
    try {
      window.fbq?.("trackSingle", META_PIXEL_ID, "Lead", {
        content_name: "Cotización solar BM Soluciones",
        content_category: "not_collected",
        currency: "MXN",
        lead_id: eventId.current,
      }, { eventID: eventId.current });
    } catch { /* Analytics must never block the confirmation. */ }
  };

  const submit = async () => {
    if (submitLock.current || !validate()) return;

    submitLock.current = true;
    setFormState("sending");
    setServerError("");

    try {
      let credentials = receiptCredentials.current;
      if (!credentials) {
        credentials = await requestReceiptCredentials();
        receiptCredentials.current = credentials;
      }

      await uploadReceipt(credentials);
      setFormState("success");
      trackLead();
    } catch {
      submitLock.current = false;
      if (receiptCredentials.current) {
        setFormState("upload-error");
      } else {
        setFormState("editing");
        setServerError("No pudimos confirmar el envío. Tus datos siguen aquí; inténtalo nuevamente.");
      }
    }
  };

  if (formState === "success") {
    return <div className={styles.result} role="status" aria-live="polite">
      <span aria-hidden="true">✓</span>
      <h3>Solicitud y recibo recibidos</h3>
      <p>Ya tenemos lo necesario para revisar tu consumo. El equipo de BM Soluciones te contactará por WhatsApp con el siguiente paso.</p>
    </div>;
  }

  if (formState === "upload-error") {
    return <div className={styles.result} role="alert" aria-live="assertive">
      <span className={styles.info} aria-hidden="true">i</span>
      <h3>Tu solicitud ya está guardada</h3>
      <p>Solo falta terminar de subir el recibo. Puedes reintentarlo sin volver a enviar tus datos.</p>
      <button type="button" className={styles.secondaryButton} onClick={() => { void submit(); }}>Reintentar subir recibo</button>
    </div>;
  }

  const lowBill = data.bill === "Menos de $2,000";
  if (lowBill) {
    return <div className={styles.result} role="status" aria-live="polite">
      <span className={styles.info} aria-hidden="true">i</span>
      <h3>Quizá no sea la mejor inversión por ahora</h3>
      <p>Por ese nivel de consumo, una instalación solar posiblemente no sea la opción con mejor retorno en este momento.</p>
      <button type="button" className={styles.secondaryButton} onClick={reset}>Cambiar respuesta</button>
    </div>;
  }

  const exploring = data.timing === "Solo estoy investigando";
  if (exploring) {
    return <div className={styles.result} role="status" aria-live="polite">
      <span className={styles.info} aria-hidden="true">i</span>
      <h3>Todavía no necesitamos tu recibo</h3>
      <p>Cuando estés más cerca de instalar, vuelve y con gusto revisamos tu consumo para preparar una propuesta.</p>
      <button type="button" className={styles.secondaryButton} onClick={reset}>Cambiar respuesta</button>
    </div>;
  }

  return <div className={`${styles.card} ${variant === "direct" ? styles.direct : ""}`}>
    <h3>Cotiza tu sistema solar</h3>
    <p className={styles.intro}>Completa tus datos y sube tu recibo de luz. Con eso podremos preparar una propuesta basada en tu consumo.</p>

    <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <section className={styles.contactSection} aria-labelledby="bm-contact-title">
        <h4 id="bm-contact-title">Datos de contacto</h4>
        <p>Te contactaremos para explicarte la propuesta y resolver tus dudas.</p>

        <div className={styles.contactGrid}>
          <div className={styles.field}>
            <label htmlFor="bm-flat-lead-name">Nombre</label>
            <input ref={nameInput} id="bm-flat-lead-name" autoComplete="name" enterKeyHint="next" placeholder="Ej. Ana" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "bm-flat-name-error" : undefined} value={data.name} onFocus={trackFormStart} onChange={(event) => update("name", event.target.value)} />
            {errors.name && <small id="bm-flat-name-error" role="alert">{errors.name}</small>}
          </div>
          <div className={styles.field}>
            <label htmlFor="bm-flat-lead-phone">WhatsApp</label>
            <input ref={phoneInput} id="bm-flat-lead-phone" type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="next" maxLength={14} placeholder="10 dígitos" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "bm-flat-phone-error" : undefined} value={data.phone} onFocus={trackFormStart} onChange={(event) => update("phone", event.target.value)} />
            {errors.phone && <small id="bm-flat-phone-error" role="alert">{errors.phone}</small>}
          </div>
          <div className={`${styles.field} ${styles.emailField}`}>
            <label htmlFor="bm-flat-lead-email">Correo electrónico</label>
            <input ref={emailInput} id="bm-flat-lead-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" placeholder="nombre@correo.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "bm-flat-email-error" : undefined} value={data.email} onFocus={trackFormStart} onChange={(event) => update("email", event.target.value)} />
            {errors.email && <small id="bm-flat-email-error" role="alert">{errors.email}</small>}
          </div>
        </div>
      </section>

      <fieldset id="bm-flat-bill-group" className={styles.group} tabIndex={-1} aria-describedby={errors.bill ? "bm-flat-bill-error" : undefined}>
        <div className={styles.questionHeading}>
          <legend>¿Cuánto pagas por recibo de luz?</legend>
        </div>
        <div className={styles.options}>
          {billOptions.map((option) => <label key={option} className={`${styles.option} ${data.bill === option ? styles.selected : ""}`}>
            <input type="radio" name="bill" value={option} checked={data.bill === option} onChange={() => update("bill", option)} />
            <span>{option}</span><i aria-hidden="true" />
          </label>)}
        </div>
        {errors.bill && <small id="bm-flat-bill-error" className={styles.groupError} role="alert">{errors.bill}</small>}
      </fieldset>

      <fieldset id="bm-flat-timing-group" className={styles.group} tabIndex={-1} aria-describedby={errors.timing ? "bm-flat-timing-error" : undefined}>
        <div className={styles.questionHeading}>
          <legend>¿Cuándo te gustaría instalar?</legend>
        </div>
        <div className={styles.options}>
          {timingOptions.map((option) => <label key={option} className={`${styles.option} ${data.timing === option ? styles.selected : ""}`}>
            <input type="radio" name="timing" value={option} checked={data.timing === option} onChange={() => update("timing", option)} />
            <span>{option}</span><i aria-hidden="true" />
          </label>)}
        </div>
        {errors.timing && <small id="bm-flat-timing-error" className={styles.groupError} role="alert">{errors.timing}</small>}
      </fieldset>

      <div className={styles.receiptField}>
        <label htmlFor="bm-flat-lead-receipt">Recibo de luz</label>
        <input
          ref={receiptInput}
          className={styles.fileInput}
          id="bm-flat-lead-receipt"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/heic,image/heif,image/jpeg,image/png,image/webp"
          aria-invalid={Boolean(errors.receipt)}
          aria-describedby={errors.receipt ? "bm-flat-receipt-error" : "bm-flat-receipt-help"}
          onChange={(event) => selectReceipt(event.target.files?.[0] || null)}
        />
        <label className={`${styles.uploadControl} ${receipt ? styles.hasFile : ""}`} htmlFor="bm-flat-lead-receipt">
          <span className={styles.uploadIcon} aria-hidden="true">↑</span>
          <span><strong>{receipt ? receipt.name : "Subir mi recibo"}</strong><small id="bm-flat-receipt-help">{receipt ? "Archivo listo para enviar" : "Foto o PDF · máximo 20 MB"}</small></span>
        </label>
        {errors.receipt && <small id="bm-flat-receipt-error" className={styles.receiptError} role="alert">{errors.receipt}</small>}
      </div>

      <button type="submit" className={styles.submit} disabled={formState === "sending"}>{formState === "sending" ? "Enviando solicitud…" : "Enviar y solicitar propuesta"}</button>
      {serverError && <p className={styles.serverError} role="alert">{serverError}</p>}
    </form>

    <div className={styles.trust} aria-label="Beneficios de la propuesta"><span>Propuesta sin costo</span><span>Atención personalizada</span><span>Datos protegidos</span></div>
  </div>;
}
