/* eslint-disable @next/next/no-img-element -- BM's real installation photos are already optimized WebP assets. */
import { FlatLeadForm } from "./flat-lead-form";

const trustPoints = [
  "Propuesta basada en tu consumo",
  "Atención en Guadalajara y Zona Metropolitana",
  "Ingeniería e instalación del sistema solar",
] as const;

const installations = [
  {
    src: "/installations/thumbs/installation-04.webp",
    alt: "Vista aérea de una instalación solar realizada por BM Soluciones",
    caption: "Sistema instalado y en operación",
    width: 560,
    height: 420,
  },
  {
    src: "/installations/thumbs/installation-02.webp",
    alt: "Inversor y estructura instalados por BM Soluciones",
    caption: "Equipamiento y estructura",
    width: 560,
    height: 420,
  },
  {
    src: "/installations/thumbs/installation-06.webp",
    alt: "Paneles solares instalados por BM Soluciones en una azotea",
    caption: "Proyecto residencial terminado",
    width: 560,
    height: 420,
  },
] as const;

const processSteps = [
  ["01", "Comparte tus datos y recibo de luz"],
  ["02", "Revisamos tu consumo y tu proyecto"],
  ["03", "Te contactamos con una propuesta"],
] as const;

const assurances = [
  {
    label: "PANELES",
    title: "12 años contra defectos de fábrica",
    text: "La cobertura aplicable queda especificada en tu propuesta y depende del equipo seleccionado.",
  },
  {
    label: "INVERSORES",
    title: "5 años en inversor central · 12 años en microinversor",
    text: "Seleccionamos la tecnología de inversión de acuerdo con las necesidades de cada sistema.",
  },
  {
    label: "ESTRUCTURA",
    title: "12 años de garantía",
    text: "El sistema de montaje se define según las condiciones y características del inmueble.",
  },
  {
    label: "INSTALACIÓN",
    title: "3 años con mantenimiento preventivo",
    text: "La garantía de instalación aplica realizando mantenimiento preventivo al menos dos veces al año.",
  },
] as const;

export default function QuotePage() {
  return <main className="bm-hybrid-landing">
    <header className="bm-site-header" id="inicio">
      <a className="bm-site-brand" href="#inicio" aria-label="BM Soluciones, ir al inicio">
        <span className="bm-logo-mark" aria-hidden="true">BM</span>
        <span className="bm-wordmark"><b>BM SOLUCIONES</b><small>ENERGÍA QUE SE NOTA</small></span>
      </a>
      <a className="bm-header-cta" href="#cotiza">Calcular ahorro</a>
    </header>

    <section className="bm-hybrid-hero" aria-labelledby="bm-hero-title">
      <div className="bm-hero-shell">
        <div className="bm-hero-copy">
          <p className="bm-hero-location">GUADALAJARA · ZONA METROPOLITANA</p>
          <h1 id="bm-hero-title"><span>¿Pagas más de $2,000 de luz?</span> Descubre cuánto podrías ahorrar con paneles solares.</h1>
          <p className="bm-hero-subheadline">Analizamos tu consumo para diseñar una propuesta solar para tu casa o negocio y mostrarte cuánto podrías reducir tu gasto de electricidad.</p>
          <a className="bm-primary-cta" href="#cotiza">Calcular mi posible ahorro</a>
        </div>

        <figure className="bm-hero-installation">
          <picture>
            <source media="(max-width: 800px)" srcSet="/installations/thumbs/installation-05.webp" />
            <img
              src="/installations/full/installation-05.webp"
              width="1280"
              height="720"
              alt="Instalación real de paneles solares realizada por BM Soluciones"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <figcaption><span aria-hidden="true" /> Instalación real de BM Soluciones</figcaption>
        </figure>
      </div>
    </section>

    <section className="bm-instant-trust" aria-label="Por qué confiar en BM Soluciones">
      <ul>
        {trustPoints.map((point) => <li key={point}><span aria-hidden="true" /><strong>{point}</strong></li>)}
      </ul>
    </section>

    <section className="bm-real-work bm-compact-section" aria-labelledby="bm-installations-title">
      <div className="bm-editorial-heading">
        <p>Instalaciones reales</p>
        <h2 id="bm-installations-title">Trabajo realizado por BM Soluciones</h2>
        <span>Proyectos reales instalados por nuestro equipo en hogares y negocios.</span>
      </div>
      <div className="bm-installation-grid">
        {installations.map((installation, index) => <figure className={index === 0 ? "bm-installation-card bm-installation-featured" : "bm-installation-card"} key={installation.src}>
          <img src={installation.src} alt={installation.alt} width={installation.width} height={installation.height} loading="lazy" decoding="async" />
          <figcaption>{installation.caption}</figcaption>
        </figure>)}
      </div>
    </section>

    <section className="bm-how-it-works" aria-labelledby="bm-process-title">
      <div className="bm-compact-section">
        <div className="bm-editorial-heading">
          <p>Proceso simple</p>
          <h2 id="bm-process-title">Cómo funciona</h2>
        </div>
        <ol className="bm-process-grid">
          {processSteps.map(([number, title]) => <li key={number}><span>{number}</span><strong>{title}</strong></li>)}
        </ol>
      </div>
    </section>

    <section className="bm-assurance-section" aria-labelledby="bm-assurance-title">
      <div className="bm-compact-section">
        <div className="bm-editorial-heading">
          <p>Respaldo y garantías</p>
          <h2 id="bm-assurance-title">Tu propuesta deja claro cómo queda respaldado el sistema.</h2>
          <span>Las garantías finales se detallan de acuerdo con el equipo y las condiciones de cada proyecto.</span>
        </div>

        <div className="bm-assurance-grid">
          {assurances.map((item) => <article className="bm-assurance-card" key={item.label}>
            <span>{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>)}
        </div>

        <div className="bm-project-strip">
          <p><strong>01</strong><span>Evaluación y diseño del sistema fotovoltaico.</span></p>
          <p><strong>02</strong><span>Suministro, instalación y puesta en operación.</span></p>
          <p><strong>03</strong><span>Monitoreo, soporte y mantenimiento.</span></p>
          <a href="#cotiza">Solicitar propuesta</a>
        </div>
      </div>
    </section>

    <section className="bm-evaluation-section" id="cotiza" aria-label="Cotización solar">
      <div className="bm-evaluation-shell">
        <FlatLeadForm />
      </div>
    </section>

    <footer className="bm-site-footer">
      <div className="bm-site-brand" aria-label="BM Soluciones">
        <span className="bm-logo-mark" aria-hidden="true">BM</span>
        <span className="bm-wordmark"><b>BM SOLUCIONES</b><small>ENERGÍA QUE SE NOTA</small></span>
      </div>
      <p>BM Soluciones · Guadalajara y Zona Metropolitana<br />33 2833 7776 · solucionesbm2023@gmail.com</p>
    </footer>
  </main>;
}
