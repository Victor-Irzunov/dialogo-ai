// /app/api/support/triage/route.js
import { auth, bad, ok, options, openai } from "../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }

export async function POST(req){
  if(!auth(req)) return bad("unauthorized", 401);
  const body = await req.json().catch(()=>({}));
  const message = (body.message||"").toString();
  const context = body.context || {};
  if(!message.trim()) return ok({
    intent: 'general_support',
    need_ticket: true,
    user_reply: 'Опишите, пожалуйста, проблему чуть подробнее.',
    confidence: 0.2,
  });

  // если ключа нет — эвристика
  if(!process.env.OPENAI_API_KEY){
    const low = /возврат|рефанд|refund|двойн|списан|чек|не пришл|ошибк|баг|не работает|не вид(но|ит)|нет доступ|подписк/i.test(message);
    return ok({
      intent: low ? 'billing_or_access_issue' : 'general_support',
      need_ticket: true,
      user_reply: 'Я передам информацию администратору и вернусь с ответом. Укажите e-mail или ID платежа.',
      confidence: 0.5,
    });
  }

  const client = openai();
  const prompt = [
    { role: 'system', content: 'Ты ассистент саппорта Dialogo. Коротко, по-русски. Верни строго JSON без пояснений.' },
    { role: 'user', content:
      `Сообщение пользователя: """${message}"""\n` +
      `Контекст: ${JSON.stringify(context)}\n` +
      `Верни JSON: {"intent":"string","need_ticket":true|false,"user_reply":"короткий ответ","confidence":0..1}`
    }
  ];

  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: prompt,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  let data = {};
  try { data = JSON.parse(r?.choices?.[0]?.message?.content || '{}'); }
  catch {}

  return ok({
    intent: String(data.intent || 'general_support'),
    need_ticket: !!data.need_ticket,
    user_reply: String(data.user_reply || 'Мы разберёмся и вернёмся с ответом.'),
    confidence: Number(data.confidence ?? 0.5),
  });
}
