// /app/api/programs/[slug]/coach/route.js  (в проекте ai.dialogo.by)
import { NextResponse } from 'next/server';
import { auth, openai } from '../../../_utils'; // подправьте путь под свой utils

export const runtime = 'nodejs';
export async function OPTIONS(){ return NextResponse.json({}, { status: 200 }); }

export async function POST(req, { params }) {
  // защита внутренним токеном, который вы пробрасываете через Nginx
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const slug = params?.slug || '';
  const { dayNumber = 1, context = {} } = await req.json().catch(() => ({}));

  const client = openai();
  const messages = [
    { role: 'system', content: `Ты коуч Dialogo. Кратко и по делу, по-русски.` },
    { role: 'user', content: `Программа: ${slug}\nДень: ${dayNumber}\nКонтекст: ${JSON.stringify(context)}` }
  ];

  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    messages
  });

  const coach = r?.choices?.[0]?.message?.content?.trim() || '';
  return NextResponse.json({ coach });
}
