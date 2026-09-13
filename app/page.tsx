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
  ["02", "Dimensionamos el sistema para tu consumo"],
  ["03", "Te contactamos para explicarte la propuesta"],
] as const;

const projectScope = [
  {
    number: "01",
    title: "Análisis de consumo",
    text: "Revisamos tu recibo para entender cuánto consumes y cuánto estás pagando actualmente.",
  },
  {
    number: "02",
    title: "Diseño y dimensionamiento",
    text: "Calculamos la capacidad del sistema solar de acuerdo con las necesidades de tu inmueble.",
  },
  {
    number: "03",
    title: "Instalación y puesta en operación",
    text: "Instalamos paneles, inversor y estructura, y dejamos el sistema listo para generar energía.",
  },
  {
    number: "04",
    title: "Monitoreo de tu sistema",
    text: "Configuramos la plataforma de monitoreo para que puedas consultar la generación de energía.",
  },
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

    <section className="bm-evaluation-section" id="cotiza" aria-labelledby="bm-evaluation-title">
      <div className="bm-evaluation-shell">
        <aside className="bm-evaluation-intro">
          <p className="bm-evaluation-kicker">COTIZACIÓN PERSONALIZADA</p>
          <h2 id="bm-evaluation-title">Empecemos por tu consumo real.</h2>
          <p>Completa el formulario y adjunta tu recibo. Con esa información podremos preparar una propuesta solar para tu casa o negocio.</p>

          <ol>
            {processSteps.map(([number, title]) => <li key={number}><span>{number}</span><strong>{title}</strong></li>)}
          </ol>

          <p className="bm-evaluation-location"><strong>Zona de atención</strong> Guadalajara y Zona Metropolitana.</p>
        </aside>
        <FlatLeadForm />
      </div>
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

    <section className="bm-how-it-works" aria-labelledby="bm-project-title">
      <div className="bm-compact-section">
        <div className="bm-editorial-heading">
          <p>Tu proyecto solar</p>
          <h2 id="bm-project-title">Un sistema diseñado para tu consumo, no una cotización genérica.</h2>
          <span>BM Soluciones se encarga del proyecto fotovoltaico desde el análisis inicial hasta la puesta en operación.</span>
        </div>
        <div className="bm-scope-grid">
          {projectScope.map((item) => <article key={item.number}>
            <span>{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>)}
        </div>
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
          <p><strong>01</strong><span>Propuesta basada en tu recibo y consumo.</span></p>
          <p><strong>02</strong><span>Equipamiento definido para cada proyecto.</span></p>
          <p><strong>03</strong><span>Instalación, puesta en operación y monitoreo.</span></p>
          <a href="#cotiza">Solicitar propuesta</a>
        </div>
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
