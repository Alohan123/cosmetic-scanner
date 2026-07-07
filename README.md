# LASERSKIN

Precision skincare scanning. Point your camera at any cosmetic product and get an AI ingredient analysis, a quality score, live web reviews and prices, and (with a skin profile) a personal match percentage for your skin.

**Live app:** https://alohan123.github.io/cosmetic-scanner/

## Features

- Scan by camera, upload, paste or drag-and-drop
- Claude Vision product identification with ingredient-level scoring and caution flags
- Live web lookup: review summary, rating, online sellers, cited sources
- Skin profile: optional AI face scan estimates type, tone, hydration and concerns, then you confirm in three steps
- Personalized results: match percentage, ingredients flagged against your sensitivities, melanin-aware weighting
- Scan history with filters, side-by-side compare, save and routine flags
- Smart caching: rescanning the same image costs zero API calls; rescanning a known product skips the web call
- Installable PWA (Add to Home screen). An APK can be generated from the live URL at pwabuilder.com

## Running it

It is a single static file. Serve the folder any way you like:

```
python3 -m http.server 8000
```

Open http://localhost:8000. Camera capture requires localhost or HTTPS.

## API key

The app calls the Anthropic API. Two modes:

1. **Direct (default):** open Settings in the app and paste your own key from console.anthropic.com. It is stored only in your browser's localStorage.
2. **Proxy (recommended for sharing):** deploy `worker.js` as a Cloudflare Worker with your key as the `ANTHROPIC_API_KEY` secret (instructions in the file header), then paste the worker URL into Settings or `CONFIG.PROXY_URL`. Visitors then need no key, and the key never ships to the browser.

Never commit a key to this repo. It is public.

## Design

Implemented from the LASERSKIN Figma system: Geist and Geist Mono, bone/parchment/ink palette, nude and ember accents, electric-lime laser motif. See `CLAUDE.md` for the full token and architecture reference.

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the site updates in about a minute.
