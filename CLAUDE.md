# CLAUDE.md — LASERSKIN

AI cosmetic scanner. Point a camera at any skincare product, Claude Vision identifies it, scores the ingredients, personalizes the result to the user's skin profile, and pulls live web data for reviews, prices and sources.

- **Live app:** https://alohan123.github.io/cosmetic-scanner/
- **Repo:** https://github.com/Alohan123/cosmetic-scanner (GitHub Pages, `main` branch, root)
- **Design source of truth:** Figma file `Claude-Play`, key `V4AOwHryv9YFZWHmcSVtx7`, canvas node `903:2` ("Laser Skin"). All screens in the app are implemented from this file. Consult it before changing any UI.
- **Owner:** Emmanuel (GitHub: Alohan123). Related venture: SkinLens (same pricing strategy appears on the paywall).

## Stack and philosophy

Single-file vanilla app. No framework, no build step, no bundler. `index.html` contains all CSS, markup and JS. Keep it that way unless Emmanuel asks to modularize; a push to `main` is the entire deploy pipeline (Pages redeploys in 1-2 minutes).

## File map

| File | Purpose |
|---|---|
| `index.html` | The whole app: design system CSS, all screens, all logic (~1,120 lines) |
| `worker.js` | Cloudflare Worker proxy. Holds the Anthropic key server-side so visitors scan keyless. Not deployed from this repo; pasted into the Cloudflare dashboard |
| `manifest.webmanifest` | PWA manifest (installable app, used by PWABuilder for APK packaging) |
| `sw.js` | Service worker. Network-first for shell, cache fallback offline. Never intercepts POST (API calls pass through) |
| `icon-*.png`, `apple-touch-icon.png` | App icons: ink `#1F1915` background, lime `#CDF548` rounded mark with ink laser slash |

## Design system (from Figma, do not drift)

- **Fonts:** Geist (400/500/600) and Geist Mono (500) via Google Fonts.
- **Palette:** Bone Mist `#F0EEE9`, Parchment `#FCFAF5`, Sand Stone `#D6D1C4`, Midnight Ink `#1F1915`, Moonlight Ivory `#FFFDF6`, Nude `#FDCD80`, Ember Red `#FA4149`, electric lime `#CDF548` (approximation of "Lime Haze", the only swatch without a hex in Figma).
- **Type scale:** display 32/-1, heading 24/-0.5 (`.h-page`), title SemiBold 17, body 15, mono labels 10px with 0.8px tracking uppercase (`.mono`).
- **Theming:** light screens use bone/parchment/ink; dark screens add class `dark` on the `.scr` section (ink background, ivory text, lime accents). Both palettes are wired through CSS variables at `:root`.
- **Key components:** `.chip` (mono pills; variants `caution`, `flag`, `detected`, `lime`, `line`), `.btn` (`prime`, `lime`, `ghost`), `.vf` viewfinder with lime corner brackets and animated `.laser`, `.sheet` parchment result sheet with `.handle`, `.callout` verdict block with nude/ember accent bar, `.matchcard` ink card with lime match bar.

## App architecture

- **Navigation:** screen state machine. `show('X')` toggles `#scrX`. Screens: `Onboard, Scan, Result, NoMatch, Limit, Paywall, Welcome, Face, FaceDone, Type, Concerns, Sens, History, Compare`. Overlay sheets (`.osheet`): `shSources, shBuy, shDerm, shAccuracy, shSettings` via `openSheet()/closeSheets()`.
- **Globals used by inline `onclick`:** `show, openSheet, openSources, openBuy, toggleSave, addRoutine, backToPick`. Do not rename without updating the rendered HTML strings.
- **localStorage keys:**
  - `ls_key` - Anthropic API key (direct mode, this device only)
  - `ls_proxy` - Worker proxy URL override (falls back to `CONFIG.PROXY_URL`)
  - `ls_premium`, `ls_onboarded` - flags ("1"/"0")
  - `ls_profile` - `{type, concerns[], avoid[], tone 1-6, toneLabel, hydration}`
  - `ls_records` - scan history array, capped at `CONFIG.HISTORY_MAX` (40)
  - `ls_scans_YYYY-MM-DD` - free-tier counter for the day (UTC date)
- **Record shape:** `{id, ts, hash, key, thumb, img, product, web, saved, routine}` where `hash` = SHA-256 of the scan JPEG, `key` = `brand|product_name` lowercased, `thumb` = 140px JPEG, `img` = 520px JPEG (sized to respect the ~5MB localStorage quota; `saveRecord()` prunes oldest on quota errors), `product` = parsed vision JSON, `web` = parsed web-lookup JSON or `{failed:true}`.

## Claude API layer

- `callClaude(body)` routes to the proxy when `store.proxy` is set, otherwise direct to `api.anthropic.com` with `ls_key` and the `anthropic-dangerous-direct-browser-access` header. Model is locked to `claude-sonnet-4-6` in `CONFIG`.
- **Three prompts, all strict-JSON:**
  1. `productPrompt()` - vision call on the scan. Returns identity, score, chip, key_ingredients (level good/neutral/caution), verdict, search_query. When `ls_profile` exists it also returns `match_percent`, `match_line`, `flagged_for_you` and weights melanin-rich concerns.
  2. `WEB_PROMPT_TMPL(query)` - second call with the `web_search_20250305` tool (max 3 uses). Returns summary, rating, sellers, up to 7 sources.
  3. `FACE_PROMPT` - selfie vision call for cosmetic skin-typing (type, hydration, tone 1-6, concerns). Framed as an estimate, never a diagnosis; returns `{ok:false}` if no face.
- `parseModelJSON()` strips fences and grabs the outermost braces. Keep prompts demanding "ONLY valid JSON".

## Scan flow and caching (core product behavior)

1. Capture/upload/paste/drop resizes to 1200px JPEG, hashes it.
2. **Cache layer 1:** hash matches an existing record: open instantly from history. No API call, no free scan consumed, eyebrow reads "FROM YOUR SHELF".
3. Free gate: non-premium users get `FREE_SCANS_PER_DAY` (3) vision scans per day; gate screen at 0.
4. Vision call. `identified:false` routes to the NoMatch screen.
5. **Cache layer 2:** if `brand|name` matches an existing record, reuse its `web` data and skip the web call. Otherwise `fetchWeb()` runs async and re-renders the sheet when done.

## Security rules (non-negotiable)

- **Never hardcode or commit an API key, token or secret.** Repo and site are public; a committed key will be scraped and drained (classic Denial-of-Wallet). This has been explicitly decided with the owner.
- Key delivery today: user pastes into Settings, or a private one-time link `.../#k=KEY` seeds localStorage and strips the fragment. The owner has such a link; never write it into any file.
- Keyless visitors: deploy `worker.js` (holds key as CF secret, CORS-locked to the Pages origin, locks model, caps max_tokens), then set `CONFIG.PROXY_URL` or the Settings proxy field.
- Advise a monthly spend limit in the Anthropic console when touching billing-adjacent features.

## Local dev, deploy, testing

- Run locally: `python3 -m http.server 8000` then http://localhost:8000 (camera needs localhost or HTTPS; both Pages and localhost qualify).
- Deploy = commit to `main` and push. Nothing else.
- Syntax gate before pushing: extract the inline script and `node --check` it (there is no lint config).
- Manual test checklist: scan via upload and paste, exact-image rescan hits cache layer 1, second photo of same product skips web call, free counter decrements only on fresh vision calls, limit gate at 0, demo paywall unlock, face scan prefills the three profile steps with DETECTED chips, personalized result shows match card and FLAGGED FOR YOU, history filters, two-tap compare, sources/buy/derm/accuracy sheets, settings save, PWA install.

## Honest demo boundaries

Paywall purchase, "restore", and dermatologist booking are simulated and labeled DEMO in the UI. "Submit product" only toasts. Nearby-store data is intentionally not faked; only real web-sourced online sellers render. Keep demo labels until real billing exists.

## Roadmap candidates (discussed, not committed)

- Deploy the Worker and bake `PROXY_URL` so visitors scan keyless; add per-IP rate limiting via KV.
- Shared server-side product cache in Worker KV keyed by `brand|name` (turns per-device cache into global cache).
- Move history from localStorage to IndexedDB to lift the size cap.
- Real payments (Stripe or Paystack for NGN pricing), real product-submission endpoint.
- Native APK is produced from the live PWA via pwabuilder.com; nothing to build in this repo.
