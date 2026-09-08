/* eslint-disable @next/next/no-img-element -- Meta's noscript pixel requires a raw image request. */
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "./quiz.css";
import "./trust.css";
import "./typography.css";
import "./gallery.css";
import "./outcomes.css";
import "./redesign.css";
import "./bm.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cotiza.solucionesbm.online";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1960665047853972";
const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || "yclzfgtjmx";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Cotiza paneles solares | BM Soluciones",
  description: "Solicita una cotización de paneles solares para tu casa o negocio en Guadalajara y Zona Metropolitana.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsTestGuard = "!['1','true'].includes(new URLSearchParams(location.search).get('test'))";
  const metaPixelStub = `if(!window.fbq){window.fbq=function(){window.fbq.callMethod?window.fbq.callMethod.apply(window.fbq,arguments):window.fbq.queue.push(arguments)};window.fbq.push=window.fbq;window.fbq.loaded=!0;window.fbq.version='2.0';window.fbq.queue=[];window._fbq=window.fbq;}if(${analyticsTestGuard}){window.fbq('init',${JSON.stringify(metaPixelId)});window.fbq('track','PageView');}`;
  const metaPixelLoader = `(()=>{if(!${analyticsTestGuard}||document.querySelector('script[data-meta-pixel]'))return;const load=()=>{if(document.querySelector('script[data-meta-pixel]'))return;const s=document.createElement('script');s.async=!0;s.src='https://connect.facebook.net/en_US/fbevents.js';s.dataset.metaPixel='true';document.head.appendChild(s)};const idle=window.requestIdleCallback||((cb)=>window.setTimeout(cb,250));const engage=()=>{['pointerdown','keydown','touchstart','scroll'].forEach((event)=>window.removeEventListener(event,engage));idle(load,{timeout:1500})};['pointerdown','keydown','touchstart','scroll'].forEach((event)=>window.addEventListener(event,engage,{once:!0,passive:!0}))})()`;
  const clarityStub = "window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};";
  const clarityLoader = `(()=>{if(!${analyticsTestGuard}||document.querySelector('script[data-clarity]'))return;const load=()=>{if(document.querySelector('script[data-clarity]'))return;const s=document.createElement('script');s.async=!0;s.src='https://www.clarity.ms/tag/${JSON.stringify(clarityId).slice(1,-1)}';s.dataset.clarity='true';document.head.appendChild(s)};const idle=window.requestIdleCallback||((cb)=>window.setTimeout(cb,250));const engage=()=>{['pointerdown','keydown','touchstart','scroll'].forEach((event)=>window.removeEventListener(event,engage));idle(load,{timeout:1500})};['pointerdown','keydown','touchstart','scroll'].forEach((event)=>window.addEventListener(event,engage,{once:!0,passive:!0}))})()`;
  return <html lang="es"><head>
    {metaPixelId && <script id="meta-pixel-stub" dangerouslySetInnerHTML={{ __html: metaPixelStub }} />}
    {metaPixelId && <script id="meta-pixel-loader" dangerouslySetInnerHTML={{ __html: metaPixelLoader }} />}
    {clarityId && <script id="clarity-stub" dangerouslySetInnerHTML={{ __html: clarityStub }} />}
    {clarityId && <script id="clarity-loader" dangerouslySetInnerHTML={{ __html: clarityLoader }} />}
  </head><body className={poppins.className}>{children}{metaPixelId && <noscript><img height="1" width="1" style={{display:"none"}} src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`} alt="" /></noscript>}</body></html>;
}
