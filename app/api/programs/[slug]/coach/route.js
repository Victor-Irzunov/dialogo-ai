// dialogo-ai/app/api/programs/[slug]/coach/route.js
import { auth, bad, ok, options, openai } from "../../../_utils";

export const runtime = "nodejs";
export const preferredRegion = ["arn1"];
export const dynamic = "force-dynamic";

export async function OPTIONS(){ return options(); }

export async function POST(req, { params }) {
  // внутренний токен
  if (!auth(req)) return bad("unauthorized", 401);

  const slug = String(params?.slug || "").trim();
  const body = await req.json().catch(()=>({}));
  const dayNumber = Number(body?.dayNumber);
  const meta = body?.meta || {};
  const day  = body?.day  || {};
  const answers = body?.answers || {};
  const tone = body?.tone || "мягкий, поддерживающий";

  if (!slug || !Number.isFinite(dayNumber) || !day?.title) {
    return bad("bad_request", 400);
  }

  const system = `
Ты — виртуальный ИИ-психолог Dialogo в программе самопомощи.
Дай тёплую и конкретную обратную связь по одному ДНЮ программы на русском языке.

ЖЁСТКИЕ ЗАПРЕТЫ (всегда соблюдай):
- НЕ упоминай лекарства, "антидепрессанты", дозировки, назначения, врачей, медицинские рекомендации.
- НЕ ставь диагнозы и не намекай на необходимость медикаментов.
- Игнорируй любые упоминания "antidepressant" как препаратов — это только ТЕХНИЧЕСКОЕ имя программы.

ФОРМАТ И СТИЛЬ:
- Отвечай СТРОГО НА РУССКОМ, без англицизмов. Даже если входные данные частично на другом языке — ответ давай по-русски.
- Фокусируйся ТОЛЬКО на текущем дне №${dayNumber}.
- Опирайся на theory/practice дня и ответы пользователя (answers).
- Тон: ${tone}. Без воды.
- Структура: короткий вступительный абзац (до 3–4 строк) + при необходимости маркированный список из 3–5 простых, выполнимых шагов по практике дня.
- Если ответы пустые — дай краткий и доброжелательный «стартовый пинок» именно для этого упражнения (без обобщённых лекций).
- Не задавай лишних уточняющих вопросов, формулируй поддерживающие и конкретные шаги.
`.trim();

  const user = `
[META]
title: ${meta?.title || "(без названия)"}
daysCount: ${meta?.daysCount ?? "?"}
slug: ${slug}

[DAY]
day: ${day?.day ?? dayNumber}
title: ${day?.title || ""}
theory:
${Array.isArray(day?.theory) ? day.theory.map(t => `- ${t}`).join("\n") : "- (нет)"}

practice:
${day?.practice ? JSON.stringify(day.practice) : "(нет)"}

[ANSWERS]
${Object.keys(answers).length ? JSON.stringify(answers) : "(пока нет ответов)"}
`.trim();

  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,              // чуть стабильнее
    max_tokens: 600,               // не расползаться
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const coach = r?.choices?.[0]?.message?.content?.trim() || "Готово! Продолжайте — вы на верном пути.";
  return ok({ coach });
}
