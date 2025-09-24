import { auth, bad, ok, options, openai } from "../../_utils";

export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }

export async function POST(req){
  // защищаем внутренним токеном (x-internal-token === process.env.INTERNAL_TOKEN)
  if (!auth(req)) return bad("unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message || "").trim();
  const context = body?.context || {};
  if (!message) return bad("message required", 400);

  // --- ВАШ PROMPT ТУТ ---
  const prompt = [
    {
      role: "system",
      content:
        "Ты ассистент саппорта Dialogo. Отвечай кратко, по-русски. Верни строго JSON без пояснений."
    },
    {
      role: "user",
      content:
        `Сообщение пользователя: """${message}"""\n` +
        `Контекст: ${JSON.stringify({
          hasAccess: !!context.hasAccess,
          everPaid: !!context.everPaid,
          plan: context.plan ?? null,
          expires: context.expires ?? null,
        })}\n` +
        `Задача: определи intent и need_ticket. Верни JSON:\n` +
        `{"intent": "string", "need_ticket": true|false, "user_reply": "короткий ответ", "confidence": 0..1}`
    }
  ];

  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: prompt,
  });

  const txt = r?.choices?.[0]?.message?.content || "{}";
  let data;
  try { data = JSON.parse(txt); } catch { data = {}; }

  return ok({
    intent: String(data.intent || "general_support"),
    need_ticket: !!data.need_ticket,
    user_reply: String(data.user_reply || "Мы разберёмся и вернёмся с ответом."),
    confidence: Number.isFinite(+data.confidence) ? +data.confidence : 0.5,
  });
}