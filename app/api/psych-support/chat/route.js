// /app/api/psych-support/chat/route.js  (ai.dialogo)
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const preferredRegion = ['arn1'];
export const dynamic = 'force-dynamic';

async function askAI(message, ctx) {
  const key = process.env.OPENAI_API_KEY;

  const guardReply =
    'Я служба поддержки только по оплатам, тарифу «Профи», VIP-закреплению и поднятию объявлений. Пожалуйста, вернёмся к вашей проблеме по оплате/тарифу/продвижению.';
  const offTopic =
    /тест|контент|seo|дизайн|совет|психологич|проблем.*клиент/i.test(message) &&
    !/оплат|тариф|профи|vip|закрепл|подним/i.test(message);

  if (!key) {
    if (offTopic) {
      return {
        intent: 'out_of_scope',
        need_ticket: false,
        user_reply: guardReply,
        confidence: 0.6,
      };
    }
    const need = /не прош|списан|двойн|возврат|рефанд|чек|квитанц|ошибк|не видн|не актив/i.test(message);
    return {
      intent: /vip|закреп/i.test(message)
        ? 'vip_issue'
        : /подня/i.test(message)
        ? 'boost_issue'
        : /профи|тариф/i.test(message)
        ? 'pro_issue'
        : need
        ? 'billing_or_access_issue'
        : 'general_billing',
      need_ticket: need || /не решен|не решён|срочно/i.test(message),
      user_reply: need
        ? 'Понимаю. Уточните дату и способ оплаты, последние 4 цифры карты (или ID оплаты), я проверю поступление.'
        : 'Опишите, пожалуйста, проблему чуть подробнее: дата оплаты, сервис/банк и что именно не работает.',
      confidence: 0.5,
    };
  }

  const prompt = [
    {
      role: 'system',
      content:
`Ты ассистент саппорта Dialogo для психологов.
Отвечай кратко и по делу, по-русски.
Разрешённые темы: оплаты, тариф «Профи», VIP-закрепление, поднятия объявлений.
Если вопрос вне этих тем — мягко верни пользователя к нужной теме (не разглагольствуй).
Верни строго JSON без пояснений: {"intent": "...", "need_ticket": true|false, "user_reply": "...", "confidence": 0..1}`,
    },
    {
      role: 'user',
      content: `Вопрос: """${message}"""\nКонтекст: ${JSON.stringify(ctx)}`,
    },
  ];

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: prompt,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    }).then((x) => x.json());

    const txt = r?.choices?.[0]?.message?.content || '{}';
    const data = JSON.parse(txt);

    if (String(data.intent).includes('out_of_scope') || offTopic) {
      return {
        intent: 'out_of_scope',
        need_ticket: false,
        user_reply: guardReply,
        confidence: 0.7,
      };
    }

    return {
      intent: String(data.intent || 'general_billing'),
      need_ticket: !!data.need_ticket,
      user_reply: String(data.user_reply || 'Принял. Давайте детали оплаты (дата, способ, ID).'),
      confidence: Number(data.confidence ?? 0.5),
    };
  } catch (e) {
    console.warn('AI psych triage error:', e?.message);
    return {
      intent: 'general_billing',
      need_ticket: true,
      user_reply: 'Принял. Давайте детали оплаты (дата, способ, ID).',
      confidence: 0.4,
    };
  }
}

export async function POST(req) {
  try {
    // Включаем проверку внутреннего токена (совпадает с $ai_token из Nginx dialogo)
    const token = req.headers.get('x-internal-token') || '';
    const shared = process.env.AI_INTERNAL_TOKEN || process.env.INTERNAL_SHARED_TOKEN || '';
    if (shared && token !== shared) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const { message, ctx } = await req.json().catch(() => ({}));
    const text = String(message || '').trim();

    if (!text) {
      return NextResponse.json({
        ok: true,
        reply: 'Опишите, пожалуйста, проблему чуть подробнее.',
        intent: 'general_billing',
        escalate: false,
        aiSummary: 'empty_message',
      }, { status: 200 });
    }

    const triage = await askAI(text, ctx || {});

    return NextResponse.json({
      ok: true,
      reply: triage.user_reply,
      intent: triage.intent,
      escalate: !!triage.need_ticket,
      aiSummary: `${triage.intent} (conf=${triage.confidence})`,
    }, { status: 200 });
  } catch (e) {
    console.error('[ai.psych-support/chat] error:', e);
    return NextResponse.json({
      ok: false,
      reply: 'Техническая ошибка. Попробуйте позже.',
      error: 'server_error',
    }, { status: 200 });
  }
}
