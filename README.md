# BM Soluciones — Cotización

Formulario rápido de cotización solar para campañas de BM Soluciones.

- Producción: https://cotiza.solucionesbm.online/
- Next.js en Vercel
- Leads enviados desde el servidor a Make
- Recibos CFE en Vercel Private Blob
- Meta Pixel/CAPI con eventId compartido
- Microsoft Clarity
- QA sin eventos reales con ?test=1

## Variables de Vercel

Consulta .env.example. Los secretos nunca deben guardarse en GitHub.

## Verificación

```bash
npm ci
npm run check
```
