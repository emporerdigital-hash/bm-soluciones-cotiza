import type { Metadata } from "next";
import Link from "next/link";
import { FlatLeadForm } from "../flat-lead-form";
import styles from "./direct-quote.module.css";

export const metadata: Metadata = {
  title: "Cotización solar rápida | BM Soluciones",
  description: "Solicita una cotización de paneles solares en una sola pantalla. Sin recibo, sin costo y sin compromiso.",
  alternates: { canonical: "/cotiza" },
  robots: { index: false, follow: false },
};

export default function DirectQuotePage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="BM Soluciones, volver al inicio">
        <span className={styles.mark} aria-hidden="true">BM</span>
        <span className={styles.wordmark}>
          <b>BM SOLUCIONES</b>
          <small>ENERGÍA QUE SE NOTA</small>
        </span>
      </Link>
      <span className={styles.serviceArea}><i aria-hidden="true" /> Guadalajara · Zona Metropolitana</span>
    </header>

    <section className={styles.formOnly} aria-label="Formulario de cotización solar">
      <div className={styles.formColumn}>
        <FlatLeadForm variant="direct" />
        <p className={styles.dataUse}>Tus datos se utilizan únicamente para atender tu solicitud de cotización.</p>
      </div>
    </section>
  </main>;
}
