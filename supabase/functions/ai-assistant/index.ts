// AI Assistant for the ວຽກດ່ວນ platform — uses Lovable AI Gateway (no API key required)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_PROMPT = `ເຈົ້າແມ່ນຜູ້ຊ່ວຍ AI ຂອງແອັບ "ວຽກດ່ວນ" (workday33) ເຊິ່ງແມ່ນແພລດຟອມຫາວຽກດ່ວນ ແລະ ຈ້າງງານໃນລາວ.

ໜ້າທີ່ຂອງເຈົ້າ:
- ຊ່ວຍຜູ້ໃຊ້ຫາວຽກທີ່ເໝາະສົມ (ໝວດ: ທຳຄວາມສະອາດ, ກໍ່ສ້າງ, ສົ່ງເຄື່ອງ, ຮ້ານອາຫານ ແລະ ອື່ນໆ)
- ແນະນຳວິທີໂພສວຽກໃຫ້ດຶງດູດ (ຫົວຂໍ້, ລາຍລະອຽດ, ລາຄາ ₭, ສະຖານທີ່)
- ຕອບຄຳຖາມການໃຊ້ງານແອັບ (ການຢືນຢັນ KYC, ການເຕີມເຫຼຍ, ການແຊັດກັບເຈົ້າຂອງວຽກ)
- ແນະນຳລາຄາທີ່ສົມເຫດສົມຜົນສຳລັບແຕ່ລະປະເພດງານໃນສະກຸນ ກີບ (₭)

ກົດການຕອບ:
- ຕອບເປັນພາສາດຽວກັນກັບຜູ້ໃຊ້ (ລາວ / ໄທ / ອັງກິດ) ໂດຍຖືພາສາລາວເປັນຄ່າເລີ່ມຕົ້ນ
- ສັ້ນ ກະທັດຮັດ ເປັນກັນເອງ ໃຊ້ emoji ບາງເບົາ
- ໃຊ້ markdown (bullet, bold) ເພື່ອອ່ານງ່າຍ
- ຖ້າຜູ້ໃຊ້ຂໍຕົວຢ່າງໂພສວຽກ ໃຫ້ສ້າງເປັນ template ຄົບຖ້ວນ`;

const MODE_PROMPTS: Record<string, (lang: string) => string> = {
  chat: (lang) =>
    `${BASE_PROMPT}\n\nReply in ${lang}. Be friendly, concise, use markdown bullets/bold, light emojis. Prices in LAK (₭).`,
  summary: (lang) =>
    `${BASE_PROMPT}\n\nReply ONLY in ${lang}. Output 4-6 SHORT bullet points starting with "- ". Each bullet MUST be one short sentence (max 14 words). NO intro, NO outro, NO headings. Just bullets.`,
  template: (lang) =>
    `${BASE_PROMPT}\n\nReply ONLY in ${lang}. Output a job post template as a JSON code block ONLY (no extra text). Format:\n\`\`\`json\n{"title":"...","description":"...","price":"...LAK","location":"..."}\n\`\`\`\nTitle <60 chars. Description 2-4 sentences. Price in LAK with ₭. Location a real Lao place.`,
};

const ALLOWED_LANGS = new Set(["lo", "th", "en"]);
const ALLOWED_MODES = new Set(["chat", "summary", "template"]);

async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: anonKey },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.id;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication — prevents anonymous abuse of paid AI credits
    const authed = await verifyAuth(req);
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages = body?.messages;
    const mode = ALLOWED_MODES.has(body?.mode) ? body.mode : "chat";
    const lang = ALLOWED_LANGS.has(body?.lang) ? body.lang : "lo";
    // Note: any caller-supplied `system` field is intentionally ignored.
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Cap messages to prevent oversized requests
    const safeMessages = messages.slice(-30).map((m: any) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: typeof m?.content === "string" ? m.content.slice(0, 4000) : "",
    })).filter((m: any) => m.content);
    const systemPrompt = MODE_PROMPTS[mode](lang);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      return new Response(JSON.stringify({ error: text || "AI gateway error" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});