// /app/api/psych-suggest/route.js
import { auth, bad, ok, options, openai } from "../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }
export async function POST(req){
  if(!auth(req)) return bad("unauthorized", 401);
  const { text = "" } = await req.json().catch(()=>({}));
  if(!text.trim()) return bad("text required");
  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content:
`Верни ТОЛЬКО JSON:
{"issues":[],"preferences":[],"city":null,"ids":[]}` },
      { role: "user", content: text }
    ],
    response_format: { type: "json_object" }
  });
  let data = {};
  try { data = JSON.parse(r.choices?.[0]?.message?.content || "{}"); } catch {}
  return ok(data);
}
