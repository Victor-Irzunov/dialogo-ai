// dialogo-ai (Vercel)
// /app/api/programs/coach/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Читаем оба возможных имени переменной токена
const AI_INTERNAL_TOKEN =
  process.env.AI_INTERNAL_TOKEN ||
  process.env.INTERNAL_TOKEN ||
  '';

const OPENAI_API = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_COACH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

function json(data, init) {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    ...init,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, x-internal-token',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  return json({ error: 'method_not_allowed', hint: 'Use POST' }, { status: 405 });
}

export async function POST(req) {
  try {
    const hdrToken = req.headers.get('x-internal-token') || '';
    if (!AI_INTERNAL_TOKEN || hdrToken !== AI_INTERNAL_TOKEN) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) return json({ error: 'bad_request', hint: 'messages[] required' }, { status: 400 });
    if (!OPENAI_KEY) return json({ error: 'server_misconfigured', hint: 'OPENAI_API_KEY missing' }, { status: 500 });

    const r = await fetch(`${OPENAI_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages,
      }),
      cache: 'no-store',
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = data?.error?.message || `openai_status_${r.status}`;
      return json({ error: 'openai_error', detail }, { status: 502 });
    }

    const text =
      data?.choices?.[0]?.message?.content?.trim?.() ||
      data?.choices?.[0]?.delta?.content?.trim?.() ||
      '';

    return json({ text: text || ' ' });
  } catch (e) {
    console.error('POST /api/programs/coach error:', e);
    return json({ error: 'server_error' }, { status: 500 });
  }
}
