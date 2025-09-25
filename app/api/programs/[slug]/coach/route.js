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
  const meta = body?.meta || {};      // { title, daysCount }
  const day  = body?.day  || {};      // { day, title, theory[], practice{type,...} }
  const answers = body?.answers || {}; // сохранённые ответы шага (что есть)

  if (!slug || !Number.isFinite(dayNumber) || !day?.title) {
    return bad("bad_request", 400);
  }

  // Безопасный системный промпт:
  // - никаких лекарств/диагнозов/«антидепрессантов»/мед. рекомендаций
  // - не разговаривать про приём препаратов; слово "antidepressant" — это ТОЛЬКО имя программы
  // - строго по материалам текущего дня и ответам пользователя
  const system = `
Ты — виртуальный коуч программы самопомощи Dialogo.
Твоя задача — дать короткую, тёплую и конкретную обратную связь по одному ДНЮ программы.

ЗАПРЕТЫ (обязательно соблюдай):
- НЕ упоминай лекарства, "антидепрессанты", дозировки, назначения, врачей, медицинские рекомендации.
- НЕ ставь диагнозы и не намекай на потребность в медикаментах.
- НЕ обсуждай приём препаратов даже если видишь в данных слово "antidepressant" — это лишь ТЕХНИЧЕСКОЕ имя программы.

ФОКУС:
- Отвечай ТОЛЬКО про текущий день №${dayNumber}.
- Опирайся на theory/practice и ответы пользователя (answers) ниже.
- 1–2 предложения признания усилий + 3–5 конкретных, простых шагов/наблюдений по практике дня.
- Тон: ${body?.tone || "мягкий, поддерживающий"}; без воды, без общих лекций.
- Если ответы пустые — дай очень короткий пинок-напоминание как начать именно это упражнение.
- Форматируй кратко: абзац до 3–4 строк + маркированный список шагов (если уместно).
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
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const coach = r?.choices?.[0]?.message?.content?.trim() || "Готово! Продолжайте — вы на верном пути.";
  return ok({ coach });
}
