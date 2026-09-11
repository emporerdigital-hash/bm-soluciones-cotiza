"use client";

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

type Field = keyof LeadData;
type FormState = "editing" | "sending" | "success" | "disqualified";
type FlatLeadFormProps = { variant?: "landing" | "direct" };

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1960665047853972";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value = "") => value.replace(/\D/g, "");
const createId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const billOptions = [
  "Menos de $2,000",
  "$2,000 a $4,999",
  "$5,000 a $9,999",
  "$10,000 a $19,999",
  "Más de $20,000",
] as const;

const timingOptions = [
  "Lo antes posible",
  "En 1 a 3 meses",
  "En 3 a 6 meses",
  "Solo estoy investigando",
] as const;

const initialData: LeadData = { name: "", phone: "", email: "", bill: "", timing: "" };

export function FlatLeadForm({ variant = "landing" }: FlatLeadFormProps) {
  const [data, setData] = useState<LeadData>(initialData);
  const [formState, setFormState] = useState<FormState>("editing");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const eventId = useRef("");
  const submitLock = useRef(false);
  const formStarted = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

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

  const update = (field: Field, value: string) => {
    trackFormStart();
    setServerError("");
    setErrors((current) => ({ ...current, [field]: undefined }));
    setData((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<Field, string>> = {};
    if (data.name.trim().length < 2) nextErrors.name = "Escribe tu nombre.";
    if (digits(data.phone).length !== 10) nextErrors.phone = "Escribe un WhatsApp de 10 dígitos.";
    if (!emailPattern.test(data.email.trim())) nextErrors.email = "Escribe un correo válido.";
    if (!data.bill) nextErrors.bill = "Elige cuánto pagas por recibo.";
    if (!data.timing) nextErrors.timing = "Elige cuándo te gustaría instalar.";
    setErrors(nextErrors);

    const firstError = (["name", "phone", "email"] as const).find((field) => nextErrors[field]);
    if (firstError) {
      const refs = { name: nameInput, phone: phoneInput, email: emailInput };
      window.requestAnimationFrame(() => refs[firstError].current?.focus());
    } else if (nextErrors.bill) {
      window.requestAnimationFrame(() => document.getElementById("bm-flat-bill-group")?.focus());
    } else if (nextErrors.timing) {
      window.requestAnimationFrame(() => document.getElementById("bm-flat-timing-group")?.focus());
    }

    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setData(initialData);
    setErrors({});
    setServerError("");
    setFormState("editing");
    submitLock.current = false;
    eventId.current = "";
  };

  const submit = async () => {
    if (submitLock.current || !validate()) return;

    if (data.bill === "Menos de $2,000" || data.timing === "Solo estoy investigando") {
      setFormState("disqualified");
      return;
    }

    submitLock.current = true;
    setFormState("sending");
    setServerError("");
    if (!eventId.current) eventId.current = `lead_${createId()}`;

    const body = JSON.stringify({
      formVariant: "flat",
      name: data.name.trim(),
      phone: digits(data.phone),
      email: data.email.trim(),
      bill: data.bill,
      timing: data.timing,
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
            delivered = true;
            break;
          }
          if (response.status >= 400 && response.status < 500) break;
        } catch {
          // Retry with the same event ID so Meta and the CRM can deduplicate it.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 350 + attempt * 300));
      }
      if (!delivered) throw new Error("lead_delivery_failed");

      setFormState("success");
      if (!isTestMode()) {
        try { window.clarity?.("event", "Lead"); } catch { /* Analytics must never block the confirmation. */ }
        try {
          window.fbq?.("trackSingle", META_PIXEL_ID, "Lead", {
            content_name: "Cotización solar BM Soluciones",
            content_category: "not_collected",
            currency: "MXN",
            lead_id: eventId.current,
          }, { eventID: eventId.current });
        } catch { /* Analytics must never block the confirmation. */ }
      }
    } catch {
      submitLock.current = false;
      setFormState("editing");
      setServerError("No pudimos confirmar el envío. Tus datos siguen aquí; toca el botón nuevamente.");
    }
  };

  if (formState === "success") {
    return <div className={styles.result} role="status" aria-live="polite">
      <span aria-hidden="true">✓</span>
      <p className={styles.kicker}>Solicitud recibida</p>
      <h3>Cotización solicitada</h3>
      <p>Ya registramos tus datos. El equipo de BM Soluciones te contactará por WhatsApp para preparar tu propuesta.</p>
    </div>;
  }

  if (formState === "disqualified") {
    const lowBill = data.bill === "Menos de $2,000";
    return <div className={styles.result} role="status" aria-live="polite">
      <span className={styles.info} aria-hidden="true">i</span>
      <p className={styles.kicker}>Gracias por tu interés</p>
      <h3>{lowBill ? "Por ahora no podemos preparar tu cotización" : "Tu proyecto todavía está en etapa de investigación"}</h3>
      <p>{lowBill ? "Actualmente atendemos proyectos con recibos de $2,000 en adelante." : "Damos prioridad a quienes planean instalar durante los próximos meses. Cuando estés listo para avanzar, vuelve y con gusto cotizamos."}</p>
      <button type="button" className={styles.secondaryButton} onClick={reset}>Revisar mis respuestas</button>
    </div>;
  }

  return <div className={`${styles.card} ${variant === "direct" ? styles.direct : ""}`} onPointerDown={trackFormStart}>
    <p className={styles.kicker}>{variant === "direct" ? "Análisis solar rápido" : "Cotización solar personalizada"}</p>
    <h3>{variant === "direct" ? "Descubre cuánto podrías ahorrar en luz" : "Solicita tu cotización"}</h3>
    <p className={styles.intro}>{variant === "direct" ? "Déjanos tus datos y responde dos preguntas para estimar si la energía solar puede ayudarte a reducir tu recibo." : "Completa tus datos y dos preguntas. Todo está en esta misma pantalla."}</p>

    <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className={styles.contactGrid}>
        <div className={styles.field}>
          <label htmlFor="bm-flat-lead-name">¿Cómo te llamas?</label>
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
          <input ref={emailInput} id="bm-flat-lead-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" placeholder="correo@ejemplo.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "bm-flat-email-error" : undefined} value={data.email} onFocus={trackFormStart} onChange={(event) => update("email", event.target.value)} />
          {errors.email && <small id="bm-flat-email-error" role="alert">{errors.email}</small>}
        </div>
      </div>

      <fieldset id="bm-flat-bill-group" className={styles.group} tabIndex={-1} aria-describedby={errors.bill ? "bm-flat-bill-error" : undefined}>
        <legend>¿Cuánto pagas por recibo de luz?</legend>
        <div className={styles.options}>
          {billOptions.map((option) => <label key={option} className={`${styles.option} ${data.bill === option ? styles.selected : ""}`}>
            <input type="radio" name="bill" value={option} checked={data.bill === option} onChange={() => update("bill", option)} />
            <span>{option}</span><b aria-hidden="true">✓</b>
          </label>)}
        </div>
        {errors.bill && <small id="bm-flat-bill-error" className={styles.groupError} role="alert">{errors.bill}</small>}
      </fieldset>

      <fieldset id="bm-flat-timing-group" className={styles.group} tabIndex={-1} aria-describedby={errors.timing ? "bm-flat-timing-error" : undefined}>
        <legend>¿Cuándo te gustaría instalar?</legend>
        <div className={styles.options}>
          {timingOptions.map((option) => <label key={option} className={`${styles.option} ${data.timing === option ? styles.selected : ""}`}>
            <input type="radio" name="timing" value={option} checked={data.timing === option} onChange={() => update("timing", option)} />
            <span>{option}</span><b aria-hidden="true">✓</b>
          </label>)}
        </div>
        {errors.timing && <small id="bm-flat-timing-error" className={styles.groupError} role="alert">{errors.timing}</small>}
      </fieldset>

      <button type="submit" className={styles.submit} disabled={formState === "sending"}>{formState === "sending" ? "Enviando…" : "Recibir mi cotización"}</button>
      {serverError && <p className={styles.serverError} role="alert">{serverError}</p>}
    </form>

    <p className={styles.locationNote}>Tu ubicación aproximada se detecta automáticamente para preparar la propuesta. No necesitas escribirla.</p>
    <div className={styles.trust} aria-label="Beneficios de la cotización"><span>✓ Cotización sin costo</span><span>✓ Datos protegidos</span><span>✓ Sin compromiso</span></div>
  </div>;
}
