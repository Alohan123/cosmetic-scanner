/**
 * LASERSKIN API proxy — Cloudflare Worker
 * Holds your Anthropic API key server-side so visitors can scan without one,
 * and without your key ever appearing in the public site or repo.
 *
 * Deploy (about 5 minutes, free tier is fine):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker → deploy the hello-world
 *   2. Edit code → replace everything with this file → Deploy
 *   3. Worker → Settings → Variables & Secrets → Add → type "Secret",
 *      name ANTHROPIC_API_KEY, value = your sk-ant-... key → Save & Deploy
 *   4. Copy the worker URL (https://something.your-name.workers.dev)
 *   5. Open the LASERSKIN app → Settings → paste it in "Proxy URL" → Save
 *      (or set CONFIG.PROXY_URL in index.html to bake it in for everyone)
 *
 * Also set a monthly spend limit at console.anthropic.com → Settings → Limits.
 */
const ALLOWED_ORIGINS = [
  'https://alohan123.github.io',
  'http://localhost:8000', // local testing; remove if unused
];
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden origin', { status: 403, headers: cors });

    let body;
    try { body = await request.json(); } catch (e) { return new Response('Bad JSON', { status: 400, headers: cors }); }

    // Lock the model and cap token spend regardless of what the client sends
    body.model = MODEL;
    body.max_tokens = Math.min(Number(body.max_tokens) || 1200, MAX_TOKENS_CAP);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  },
};
