import type { Metadata } from "next";
import QuotePage from "../page";

export const metadata: Metadata = {
  title: "Cotiza paneles solares | BM Soluciones",
  description: "Descubre cuánto podrías ahorrar y solicita una propuesta solar en Guadalajara y Zona Metropolitana.",
  alternates: { canonical: "/cotiza" },
  robots: { index: false, follow: false },
};

export default function DirectQuotePage() {
  return <QuotePage />;
}
