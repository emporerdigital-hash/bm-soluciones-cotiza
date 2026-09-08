# Project instructions

This repository belongs only to the BM Soluciones fast quote form.

- Standard Next.js hosted on Vercel; main is production.
- Keep MAKE_WEBHOOK_URL and signing/blob tokens server-side.
- Preserve Meta Pixel/CAPI eventId deduplication and UTM/fbclid/fbp/fbc capture.
- Use ?test=1 for QA without creating real Make, Meta, Clarity, or Blob activity.
- Customer receipts must remain in private Vercel Blob storage with signed access and a 20 MB limit.
- Run npm run check before handoff.
