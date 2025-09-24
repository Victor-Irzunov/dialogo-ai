// /app/api/support/route.js
import { auth, bad, ok, options, openai } from "../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }
export async function POST(req){
  if(!auth(req)) return bad("unauthorized", 401);
  const { question = "" } = await req.json().catch(()=>({}));
  if(!question.trim()) return bad("question required");
  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role:"system", content:"Ты сотрудник службы поддержки Dialogo." },
      { role:"user", content: question }
    ]
  });
  return ok({ text: r.choices?.[0]?.message?.content ?? "" });
}
