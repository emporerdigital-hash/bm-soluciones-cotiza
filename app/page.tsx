import Link from "next/link";
import { LeadForm } from "./lead-form";

export default function QuotePage() {
  return <main className="direct-quote-page bm-direct-page">
    <header className="direct-nav bm-nav">
      <Link className="bm-brand" href="/" aria-label="BM Soluciones">
        <span className="bm-mark" aria-hidden="true">BM</span>
        <span><b>BM SOLUCIONES</b><small>ENERGÍA QUE SE NOTA</small></span>
      </Link>
      <span>Guadalajara · Zona Metropolitana</span>
    </header>

    <section className="direct-form-section" aria-labelledby="direct-quote-title">
      <div className="direct-form-header">
        <p className="eyebrow dark">COTIZA PANELES SOLARES</p>
        <h1 id="direct-quote-title">Calcula tu sistema solar en 3 minutos.</h1>
        <p>Responde estas preguntas y recibe una propuesta aterrizada a tu consumo. No necesitas subir tu recibo para comenzar.</p>
        <div className="direct-trust" aria-label="Beneficios de la cotización">
          <span><b>Sin costo</b><small>Primer diagnóstico</small></span>
          <span><b>Sin compromiso</b><small>Decides tú</small></span>
          <span><b>Datos protegidos</b><small>Uso confidencial</small></span>
        </div>
      </div>
      <div className="direct-form-card"><LeadForm variant="direct" /></div>
    </section>

    <footer className="direct-footer">
      <span>© 2026 BM Soluciones</span>
      <span>Paneles solares para casas y negocios</span>
    </footer>
  </main>;
}
