// /app/api/psych-support/chat/route.js
import { auth, bad, ok, options, openai } from "../../_utils";
export const runtime = "nodejs";
export async function OPTIONS(){ return options(); }

export async function POST(req){
  if(!auth(req)) return bad("unauthorized", 401);
  const body = await req.json().catch(()=>({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = body.system || "Ты эмпатичный психолог-консультант.";
  if(!messages.length) return bad("messages required", 400);

  const client = openai();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    messages: [{role:"system",content:system}, ...messages],
  });
  const text = r?.choices?.[0]?.message?.content || "";
  return ok({ text });
}
