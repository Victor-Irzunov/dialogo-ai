// /app/api/tests/[key]/route.js
import { auth, bad, ok, options, openai } from "../../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }
export async function POST(req,{ params }){
  if(!auth(req)) return bad("unauthorized", 401);
  const key = params?.key || "generic";
  const payload = await req.json().catch(()=>({}));
  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [{
      role:"user",
      content:`Оцени тест "${key}" по данным: ${JSON.stringify(payload)}
Верни ТОЛЬКО JSON {"score":0,"level":"low","summary":"","advice":""}`
    }],
    response_format: { type: "json_object" }
  });
  let data = {};
  try { data = JSON.parse(r.choices?.[0]?.message?.content || "{}"); } catch {}
  return ok(data);
}
