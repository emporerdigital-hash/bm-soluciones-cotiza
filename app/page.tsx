import Link from "next/link";
import { InstallationGallery, InstallationPhoto } from "./installation-gallery";
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
        <h1 id="direct-quote-title">Paga menos luz con un sistema hecho para tu consumo.</h1>
        <p>Cuéntanos cuánto pagas y recibe una propuesta para tu casa o negocio. Puedes comenzar sin subir tu recibo.</p>
        <div className="direct-trust" aria-label="Beneficios de la cotización">
          <span><b>Sin costo</b><small>Primer diagnóstico</small></span>
          <span><b>Sin compromiso</b><small>Decides tú</small></span>
          <span><b>Atención local</b><small>Guadalajara y ZM</small></span>
        </div>
        <div className="bm-hero-photos">
          <InstallationPhoto photoIndex={3} caption="Instalación comercial" compact eager />
          <InstallationPhoto photoIndex={5} caption="Instalación residencial" compact eager />
        </div>
      </div>
      <div className="direct-form-card" id="cotiza"><LeadForm variant="direct" /></div>
    </section>

    <section className="bm-basic-section" aria-labelledby="bm-benefits-title">
      <div className="bm-section-heading">
        <p className="eyebrow dark">LO QUE RECIBES</p>
        <h2 id="bm-benefits-title">Lo importante, sin complicaciones.</h2>
      </div>
      <div className="bm-benefit-grid">
        <article><span>01</span><h3>Sistema a tu medida</h3><p>Dimensionamos la propuesta con base en tu consumo y el espacio disponible.</p></article>
        <article><span>02</span><h3>Instalación profesional</h3><p>Personal de ingeniería, supervisión y técnicos para ejecutar correctamente el proyecto.</p></article>
        <article><span>03</span><h3>Monitoreo y soporte</h3><p>Configuración de monitoreo, revisión de generación y atención posterior a la instalación.</p></article>
      </div>
      <div className="bm-feature-pair">
        <InstallationPhoto photoIndex={2} caption="Sistema instalado y en operación" />
        <InstallationPhoto photoIndex={4} caption="Proyecto solar visto desde el aire" />
      </div>
    </section>

    <section className="bm-guarantee-section" aria-labelledby="bm-guarantee-title">
      <div>
        <p className="eyebrow">RESPALDO BM</p>
        <h2 id="bm-guarantee-title">Garantías claras desde tu propuesta.</h2>
        <p>Tu sistema queda respaldado con garantías claras en equipos, estructura e instalación, especificadas en tu propuesta comercial o contrato.</p>
      </div>
      <InstallationPhoto photoIndex={0} caption="Instalación real de BM Soluciones" />
      <ul>
        <li>Paneles: 12 años contra defectos de fábrica</li>
        <li>Inversor central: 5 años</li>
        <li>Microinversor: 12 años</li>
        <li>Estructura: 12 años</li>
        <li>Instalación: 3 años, con mantenimiento preventivo al menos 2 veces al año</li>
      </ul>
    </section>

    <section className="bm-process-section" aria-labelledby="bm-process-title">
      <div className="bm-section-heading">
        <p className="eyebrow dark">PROCESO SIMPLE</p>
        <h2 id="bm-process-title">De tu recibo a una propuesta clara.</h2>
      </div>
      <ol>
        <li><b>1</b><span><strong>Responde el formulario</strong><small>Solo necesitamos datos básicos de tu consumo.</small></span></li>
        <li><b>2</b><span><strong>Revisamos tu caso</strong><small>Evaluamos consumo, inmueble y necesidades.</small></span></li>
        <li><b>3</b><span><strong>Recibe tu cotización</strong><small>Te explicamos la solución y sus garantías.</small></span></li>
      </ol>
      <InstallationPhoto photoIndex={6} caption="Paneles instalados en inmueble residencial" />
    </section>

    <section className="bm-installations-section" aria-label="Trabajos realizados por BM Soluciones">
      <div className="bm-section-heading"><p className="eyebrow dark">TRABAJO REAL</p><h2>Más instalaciones realizadas por BM.</h2></div>
      <InstallationGallery />
    </section>

    <section className="bm-final-cta">
      <div><h2>Descubre cuánto puedes ahorrar.</h2><p>Solicita tu diagnóstico inicial sin costo y sin compromiso.</p></div>
      <a href="#cotiza">Cotizar ahora</a>
    </section>

    <footer className="direct-footer"><span>© 2026 BM Soluciones</span><span>Paneles solares para casas y negocios</span></footer>
  </main>;
}
