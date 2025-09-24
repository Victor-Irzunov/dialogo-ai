// /app/api/_utils.js
import OpenAI from "openai";

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "*";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export function withCors(res) {
  res.headers.set("access-control-allow-origin", ALLOW_ORIGIN);
  res.headers.set("access-control-allow-headers", "content-type,x-internal-token");
  res.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return res;
}
export function ok(data, code = 200) {
  return withCors(new Response(JSON.stringify(data), {
    status: code, headers: { "content-type": "application/json" }
  }));
}
export function bad(msg = "Bad Request", code = 400) {
  return withCors(new Response(JSON.stringify({ error: msg }), {
    status: code, headers: { "content-type": "application/json" }
  }));
}
export function options() { return withCors(new Response(null, { status: 204 })); }
export function auth(req) {
  if (!INTERNAL_TOKEN) return true;
  return (req.headers.get("x-internal-token") || "") === INTERNAL_TOKEN;
}
export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
