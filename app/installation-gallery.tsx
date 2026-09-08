/* eslint-disable @next/next/no-img-element -- Full-size photos are fetched only after the lightbox opens. */
"use client";

import { useEffect, useState } from "react";

const photos = Array.from({ length: 7 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    thumb: `/installations/thumbs/installation-${number}.webp`,
    full: `/installations/full/installation-${number}.webp`,
    alt: `Instalación solar realizada por BM Soluciones, fotografía ${index + 1}`,
  };
});

export function InstallationGallery() {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((current) => current === null ? null : (current + 1) % photos.length);
      if (event.key === "ArrowLeft") setActive((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  const move = (direction: number) => {
    setActive((current) => current === null ? null : (current + direction + photos.length) % photos.length);
  };

  return <>
    <div className="bm-gallery-heading">
      <b>Instalaciones reales</b>
      <span>Toca una foto para verla completa</span>
    </div>
    <div className="bm-real-gallery" aria-label="Galería de instalaciones realizadas por BM Soluciones">
      {photos.slice(0, 4).map((photo, index) =>
        <button key={photo.thumb} type="button" onClick={() => setActive(index)} aria-label={`Abrir fotografía ${index + 1} de ${photos.length}`}>
          <img src={photo.thumb} alt={photo.alt} width="560" height="420" loading="lazy" decoding="async" />
          {index === 3 && <span>Ver las {photos.length} fotos</span>}
        </button>
      )}
    </div>

    {active !== null && <div className="bm-lightbox" role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onClick={() => setActive(null)}>
      <button className="bm-lightbox-close" type="button" onClick={() => setActive(null)} aria-label="Cerrar visor">×</button>
      <button className="bm-lightbox-arrow previous" type="button" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Fotografía anterior">‹</button>
      <figure onClick={(event) => event.stopPropagation()}>
        <img src={photos[active].full} alt={photos[active].alt} />
        <figcaption>{active + 1} / {photos.length} · Instalación real de BM Soluciones</figcaption>
      </figure>
      <button className="bm-lightbox-arrow next" type="button" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Fotografía siguiente">›</button>
    </div>}
  </>;
}
