// /app/health/route.js
export const runtime = 'nodejs';
export async function GET() {
  return new Response(JSON.stringify({ ok: true, service: 'dialogo-ai' }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}
