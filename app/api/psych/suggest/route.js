// /app/api/psych/suggest/route.js
import { auth, bad, ok, options, openai } from "../../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }

export async function POST(req){
  if(!auth(req)) return bad("unauthorized", 401);
  const body = await req.json().catch(()=>({}));
  const query = (body.query||"").toString().trim();
  if(!query) return bad("query required", 400);

  if(!process.env.OPENAI_API_KEY){
    return ok({ suggestions: [ { title: "Личный психолог Dialogo", slug: "ai-psychologist" } ]});
  }

  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: "Ты ассистент подбора материалов/тем для психолога. Кратко, по-русски. Верни JSON-массив объектов {title,slug}."},
      { role: "user", content: `Запрос: ${query}\nВерни не более 5 пунктов.`}
    ],
    response_format: { type: "json_object" }
  });

  let data = {};
  try { data = JSON.parse(r?.choices?.[0]?.message?.content || "{}"); } catch{}
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : (Array.isArray(data) ? data : []);
  return ok({ suggestions });
}
