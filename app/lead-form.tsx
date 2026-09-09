"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

type LeadData = {
  bill?: string;
  property?: string;
  timing?: string;
  receipt?: File | null;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
};

type ContactField = "name" | "phone" | "email";
type UploadState = "idle" | "uploading" | "success" | "error";
type LeadFormProps = { variant?: "landing" | "direct" };

const bills = ["Menos de $2,000", "$2,000 a $4,999", "$5,000 a $9,999", "$10,000 a $19,999", "Más de $20,000"];
const timings = ["Lo antes posible", "En 1 a 3 meses", "En 3 a 6 meses", "Solo estoy investigando"];
const MAX_RECEIPT_SIZE = 20 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value = "") => value.replace(/\D/g, "");
const createId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const extension = (name: string) => name.toLowerCase().split(".").pop() || "";
const inferredType = (file: File) => {
  if (file.type && file.type !== "application/octet-stream") return file.type.toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", webp: "image/webp", pdf: "application/pdf" } as Record<string, string>)[extension(file.name)] || "";
};
const allowedTypes = new Set(["application/pdf", "image/heic", "image/heif", "image/jpeg", "image/png", "image/webp"]);
const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function LeadForm({ variant = "landing" }: LeadFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<LeadData>({});
  const [done, setDone] = useState(false);
  const [leadAccepted, setLeadAccepted] = useState(false);
  const [receiptCompleted, setReceiptCompleted] = useState(false);
  const [disqualified, setDisqualified] = useState<"bill" | "timing" | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({});
  const submitLock = useRef(false);
  const eventId = useRef("");
  const receiptId = useRef("");
  const receiptUploadToken = useRef("");
  const tracked = useRef(new Set<string>());
  const receiptUpload = useRef<{ id: string; file: File; promise: Promise<boolean> } | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const fieldRefs = { name: nameInput, phone: phoneInput, email: emailInput };

  const isTestMode = () => {
    const value = new URLSearchParams(window.location.search).get("test");
    return value === "1" || value === "true";
  };

  const trackOnce = (name: string, properties: Record<string, string | number | boolean> = {}) => {
    if (tracked.current.has(name) || isTestMode()) return;
    tracked.current.add(name);
    try { window.clarity?.("event", name); } catch { /* Analytics must never block the form. */ }
    try { window.fbq?.("trackCustom", name, properties); } catch { /* Analytics must never block the form. */ }
  };

  const startForm = () => trackOnce("BMFormStart");
  const goTo = (nextStep: number) => {
    setError("");
    setStep(nextStep);
    if (nextStep === 3) trackOnce("BMOptionalReceiptViewed");
  };

  const chooseBill = (selection: string) => {
    startForm();
    setError("");
    setData((current) => ({ ...current, bill: selection }));
    if (selection === "Menos de $2,000") {
      trackOnce("BMBillDisqualified", { bill_range: "under_2000" });
      setDisqualified("bill");
      return;
    }
    trackOnce("BMBillQualified", { bill_range: selection });
  };

  const chooseTiming = (selection: string) => {
    startForm();
    setError("");
    setData((current) => ({ ...current, timing: selection }));
    trackOnce("BMTimingSelected", { timeframe: selection });
  };

  const uploadReceipt = async (file: File, id: string) => {
    if (isTestMode()) {
      const response = await fetch(`/api/receipt?id=${encodeURIComponent(id)}&test=1`, {
        method: "PUT",
        headers: {
          "Content-Type": inferredType(file),
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      if (!response.ok) throw new Error("receipt_upload_failed");
      return true;
    }

    if (!receiptUploadToken.current) throw new Error("receipt_upload_not_authorized");
    // Keep the Blob client out of the initial form bundle. It is only needed
    // after a visitor chooses to upload a receipt on the last step.
    const { upload } = await import("@vercel/blob/client");
    await upload(`receipts/${id}`, file, {
      access: "private",
      handleUploadUrl: "/api/receipt/upload",
      clientPayload: JSON.stringify({ id, token: receiptUploadToken.current, fileName: file.name }),
      multipart: true,
    });
    return true;
  };

  const beginUpload = (file: File, id = createId()) => {
    setUploadState("uploading");
    setUploadError("");
    const promise = uploadReceipt(file, id)
      .then(() => {
        if (receiptUpload.current?.id === id) {
          setUploadState("success");
          setReceiptCompleted(true);
          trackOnce("BMReceiptUploaded", { file_type: inferredType(file) });
          window.setTimeout(() => {
            if (receiptUpload.current?.id === id) setDone(true);
          }, 500);
        }
        return true;
      })
      .catch(() => {
        if (receiptUpload.current?.id === id) {
          setUploadState("error");
          setUploadError("No se pudo subir el archivo. Revisa tu conexión y toca Reintentar.");
          trackOnce("BMReceiptUploadError");
        }
        return false;
      });
    receiptUpload.current = { id, file, promise };
    return promise;
  };

  const selectReceipt = (file: File | null) => {
    startForm();
    setUploadError("");
    if (!file) return;
    const contentType = inferredType(file);
    if (!allowedTypes.has(contentType)) {
      setData((current) => ({ ...current, receipt: null }));
      receiptUpload.current = null;
      setUploadState("error");
      setUploadError("Formato no compatible. Usa una foto JPG, PNG, HEIC, WEBP o un PDF.");
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      setData((current) => ({ ...current, receipt: null }));
      receiptUpload.current = null;
      setUploadState("error");
      setUploadError("El archivo supera 20 MB. Toma otra foto o elige un archivo más pequeño.");
      return;
    }
    setData((current) => ({ ...current, receipt: file }));
    trackOnce("BMReceiptSelected", { file_type: contentType });
    if (!receiptId.current) receiptId.current = createId();
    void beginUpload(file, receiptId.current);
  };

  const openReceiptPicker = (input: React.RefObject<HTMLInputElement | null>) => {
    if (!input.current) return;
    input.current.value = "";
    input.current.click();
  };

  const retryReceipt = () => {
    if (!data.receipt) {
      setUploadError("Primero toma una foto o elige el archivo de tu recibo.");
      return;
    }
    if (!receiptId.current) receiptId.current = receiptUpload.current?.id || createId();
    void beginUpload(data.receipt, receiptId.current);
  };

  const validateContact = () => {
    const errors: Partial<Record<ContactField, string>> = {};
    if ((data.name || "").trim().split(/\s+/).filter(Boolean).length < 2) errors.name = "Escribe tu nombre y al menos un apellido.";
    if (digits(data.phone).length !== 10) errors.phone = "Escribe un teléfono de 10 dígitos.";
    if (!emailPattern.test((data.email || "").trim())) errors.email = "Escribe un correo electrónico válido.";
    setFieldErrors(errors);
    const firstInvalid = (["name", "phone", "email"] as ContactField[]).find((field) => errors[field]);
    if (firstInvalid) window.requestAnimationFrame(() => fieldRefs[firstInvalid].current?.focus());
    return Object.keys(errors).length === 0;
  };

  const updateContact = (field: ContactField, value: string) => {
    startForm();
    trackOnce("BMContactStarted");
    setError("");
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setData((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    if (submitLock.current) return;
    if (!validateContact()) {
      trackOnce("BMContactValidationError");
      return;
    }
    if (!data.bill || !data.timing) {
      setError("Selecciona cuánto pagas y cuándo te gustaría instalar.");
      trackOnce("BMQuoteAnswersMissing");
      return;
    }
    submitLock.current = true;
    setSending(true);
    setError("");
    trackOnce("BMLeadSubmitClicked");
    if (!eventId.current) eventId.current = `lead_${createId()}`;
    if (!receiptId.current) receiptId.current = createId();

    const body = JSON.stringify({
      ...data,
      receipt: undefined,
      receiptMeta: {
        received: false,
        id: receiptId.current,
        fileName: "",
        contentType: "",
        size: 0,
      },
      eventId: eventId.current,
      pageUrl: window.location.href,
      referrer: document.referrer,
      testMode: isTestMode(),
    });

    try {
      let delivered = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch("/api/lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
          if (response.ok) {
            const result = await response.json() as { receiptId?: string; receiptUploadToken?: string };
            if (result.receiptId) receiptId.current = result.receiptId;
            receiptUploadToken.current = result.receiptUploadToken || "";
            if (!isTestMode() && !receiptUploadToken.current) throw new Error("missing_receipt_upload_token");
            delivered = true;
            break;
          }
          if (response.status >= 400 && response.status < 500) break;
        } catch {
          // Retry below with the same event ID, preserving deduplication.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 350 + attempt * 300));
      }
      if (!delivered) throw new Error("lead_delivery_failed");

      setSending(false);
      setLeadAccepted(true);
      trackOnce("BMLeadAccepted");
      if (!isTestMode()) {
        try {
          window.fbq?.("track", "Lead", {
            content_name: "Cotización solar BM Soluciones",
            content_category: "solar_quote",
            currency: "MXN",
            lead_id: eventId.current,
          }, { eventID: eventId.current });
        } catch { /* Tracking must never block the confirmation. */ }
      }
      setStep(3);
    } catch {
      submitLock.current = false;
      setSending(false);
      setError("No pudimos confirmar el envío. Tus datos siguen aquí; toca Cotizar nuevamente.");
      trackOnce("BMLeadSubmitError");
    }
  };

  const skipReceipt = () => {
    trackOnce("BMReceiptSkipped");
    setReceiptCompleted(false);
    setDone(true);
  };

  if (disqualified) {
    return <div className="success">
      <span>i</span>
      <h3>{disqualified === "bill" ? "Por ahora no podemos realizar tu cotización" : "Gracias por tu interés"}</h3>
      <p>{disqualified === "bill" ? "Nuestros proyectos están dirigidos a casas y negocios que pagan $2,000 por recibo de luz en adelante." : "En este momento damos prioridad a quienes planean iniciar su proyecto durante los próximos meses. Cuando estés listo para avanzar, con gusto podremos preparar tu cotización."}</p>
      <button type="button" className="button" onClick={() => { setDisqualified(null); setData({}); goTo(0); setUploadState("idle"); receiptUpload.current = null; }}>Revisar opciones</button>
    </div>;
  }

  if (done) {
    return <div className="success" aria-live="polite">
      <span>✓</span>
      <h3>{receiptCompleted ? "Recibo recibido" : "Cotización solicitada"}</h3>
      <p>{receiptCompleted ? "Tu solicitud y tu recibo quedaron registrados. Nuestro equipo preparará tu cotización y se pondrá en contacto contigo." : "Tus datos ya quedaron registrados. Nuestro equipo se pondrá en contacto contigo y podrás compartir tu recibo después."}</p>
    </div>;
  }

  if (leadAccepted && step === 3) {
    return <div className={`quiz ${variant === "direct" ? "quiz-direct" : ""}`}>
      <p className="form-kicker">Solicitud enviada</p><h2>Comparte tu recibo (opcional)</h2>
      <p className="form-copy">Una foto o PDF nos ayuda a precisar el sistema y el ahorro.</p>
      <div className="upload optional-receipt">
        <div className="lead-saved" role="status"><span aria-hidden="true">✓</span><div><b>Tu solicitud ya fue enviada</b><small>Puedes compartir el recibo ahora o después.</small></div></div>
        <input ref={cameraInput} className="receipt-input" type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp" capture="environment" aria-label="Tomar foto del recibo de CFE" onChange={(event) => selectReceipt(event.target.files?.[0] || null)} />
        <input ref={fileInput} className="receipt-input" type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf" aria-label="Elegir archivo del recibo de CFE" onChange={(event) => selectReceipt(event.target.files?.[0] || null)} />
        <div className="upload-actions"><button type="button" onClick={() => openReceiptPicker(cameraInput)}><span aria-hidden="true">▣</span><b>Tomar foto</b><small>Usar la cámara</small></button><button type="button" onClick={() => openReceiptPicker(fileInput)}><span aria-hidden="true">↑</span><b>Elegir archivo</b><small>Foto o PDF</small></button></div>
        {data.receipt && <div className={`upload-status ${uploadState}`} role="status" aria-live="polite"><div><b>{uploadState === "uploading" ? "Subiendo recibo…" : uploadState === "success" ? "Recibo listo" : "No se pudo subir"}</b><span>{data.receipt.name} · {formatSize(data.receipt.size)}</span></div>{uploadState === "uploading" && <i aria-hidden="true" />}{uploadState === "success" && <strong aria-hidden="true">✓</strong>}</div>}
        {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
        {uploadState === "error" && data.receipt && <button type="button" className="retry-upload" onClick={retryReceipt}>Reintentar carga</button>}
        {uploadState !== "uploading" && uploadState !== "success" && <button type="button" className="skip-receipt" onClick={skipReceipt}>Ahora no, terminar sin recibo</button>}
      </div>
    </div>;
  }

  return <div className={`quiz ${variant === "direct" ? "quiz-direct" : ""}`} onPointerDown={startForm}>
    <p className="form-kicker">Cotización solar personalizada</p><h2>Solicita tu cotización</h2>
    <p className="form-copy">Completa tus datos y dos preguntas. Todo está en esta misma pantalla.</p>
    <form className="single-page-quote" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="contact-fields single-page-contact">
        <div className="form-field"><label htmlFor="lead-name">¿Cómo te llamas?</label><input ref={nameInput} id="lead-name" autoFocus autoComplete="given-name" enterKeyHint="next" placeholder="Ej. Ana" aria-invalid={Boolean(fieldErrors.name)} value={data.name || ""} onChange={(event) => updateContact("name", event.target.value)} />{fieldErrors.name && <small role="alert">{fieldErrors.name}</small>}</div>
        <div className="form-field"><label htmlFor="lead-phone">WhatsApp</label><input ref={phoneInput} id="lead-phone" type="tel" inputMode="tel" autoComplete="tel-national" enterKeyHint="next" maxLength={14} placeholder="10 dígitos" aria-invalid={Boolean(fieldErrors.phone)} value={data.phone || ""} onChange={(event) => updateContact("phone", event.target.value)} />{fieldErrors.phone && <small role="alert">{fieldErrors.phone}</small>}</div>
        <div className="form-field email-wide"><label htmlFor="lead-email">Correo electrónico</label><input ref={emailInput} id="lead-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" placeholder="correo@ejemplo.com" aria-invalid={Boolean(fieldErrors.email)} value={data.email || ""} onChange={(event) => updateContact("email", event.target.value)} />{fieldErrors.email && <small role="alert">{fieldErrors.email}</small>}</div>
      </div>
      <fieldset><legend>¿Cuánto pagas por recibo de luz?</legend><div className="answers compact single-page-options">{bills.map((option) => <button type="button" key={option} onClick={() => chooseBill(option)} className={data.bill === option ? "selected" : ""} aria-pressed={data.bill === option}><span>{option}</span></button>)}</div></fieldset>
      <fieldset><legend>¿Cuándo te gustaría instalar?</legend><div className="answers compact single-page-options">{timings.map((option) => <button type="button" key={option} onClick={() => chooseTiming(option)} className={data.timing === option ? "selected" : ""} aria-pressed={data.timing === option}><span>{option}</span></button>)}</div></fieldset>
      {error && <p className="form-error final-error" role="alert">{error}</p>}
      <button className="single-page-submit" type="submit" disabled={sending}>{sending ? "Enviando cotización…" : "Recibir mi cotización"}</button>
    </form>
    <p className="location-note">Tu ubicación se detecta automáticamente para preparar la propuesta. No necesitas escribirla.</p>
    <div className="inline-trust"><span>✓ Cotización sin costo</span><span>✓ Datos protegidos</span><span>✓ Sin compromiso</span></div>
  </div>;
}
