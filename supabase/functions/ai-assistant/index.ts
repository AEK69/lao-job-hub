// AI Assistant for the ວຽກດ່ວນ platform — uses Lovable AI Gateway (no API key required)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `ເຈົ້າແມ່ນຜູ້ຊ່ວຍ AI ຂອງແອັບ "ວຽກດ່ວນ" (workday33) ເຊິ່ງແມ່ນແພລດຟອມຫາວຽກດ່ວນ ແລະ ຈ້າງງານໃນລາວ.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
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