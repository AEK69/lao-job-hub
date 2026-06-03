// Admin AI Assistant — answers admin questions about platform data/stats.
// Requires caller to be authenticated AND have 'admin' role.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function getUserId(jwt: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.id ?? null;
  } catch { return null; }
}

async function isAdmin(userId: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=user_id`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) return false;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function fetchCount(table: string, query = ""): Promise<number> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id${query ? "&" + query : ""}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "count=exact", Range: "0-0" },
  });
  const range = r.headers.get("content-range") || "";
  const total = parseInt(range.split("/")[1] || "0", 10);
  return isNaN(total) ? 0 : total;
}

async function gatherStats() {
  const [users, jobs, activeJobs, acceptedJobs, completedJobs, txs, reviews, notifs, kycPending] = await Promise.all([
    fetchCount("profiles"),
    fetchCount("jobs"),
    fetchCount("jobs", "status=eq.active"),
    fetchCount("jobs", "status=eq.accepted"),
    fetchCount("jobs", "status=eq.completed"),
    fetchCount("coin_transactions"),
    fetchCount("reviews"),
    fetchCount("notifications"),
    fetchCount("profiles", "kyc_status=eq.pending"),
  ]);

  // Sum coin balances
  let totalCoins = 0;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=coin_balance`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const rows = await r.json();
    totalCoins = (rows as any[]).reduce((s, x) => s + (x.coin_balance || 0), 0);
  } catch {}

  return {
    users, jobs, activeJobs, acceptedJobs, completedJobs, txs, reviews, notifs, kycPending, totalCoins,
    generatedAt: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = (lang: string, stats: any) => `You are the WorkDay33 admin AI assistant. You help the platform administrator analyze data, understand trends, and make decisions.

Reply in ${lang}. Use markdown (bullets, bold, tables). Be concise and data-driven.
Currency: LAK (₭). Format numbers with commas.

CURRENT PLATFORM SNAPSHOT (live):
- Total users (profiles): ${stats.users}
- KYC pending: ${stats.kycPending}
- Total jobs: ${stats.jobs} (active: ${stats.activeJobs}, accepted: ${stats.acceptedJobs}, completed: ${stats.completedJobs})
- Coin transactions: ${stats.txs}
- Total coin balance in system: ${stats.totalCoins.toLocaleString()}₭
- Reviews: ${stats.reviews}
- Notifications sent: ${stats.notifs}
- Snapshot time: ${stats.generatedAt}

Tables you know about: profiles, user_roles, jobs, job_images, conversations, messages, payments, coin_transactions, notifications, reviews, services, staff, company_settings, audit_logs.

Key flows:
- Escrow: when a worker accepts a job, employer's coins are HELD via accept_job_escrow. Both sides must confirm via confirm_job_completion to release to worker. Either side can cancel via cancel_accepted_job to refund.
- Admin can adjust balances via admin_topup_coins, transfer admin role via transfer_admin, update KYC via admin_update_kyc.
- All sensitive changes write to audit_logs automatically.

When the admin asks for stats, use the snapshot above. If they ask about something not in the snapshot, say so clearly and suggest where in the admin panel they can find it.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const uid = await getUserId(jwt);
    if (!uid) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!(await isAdmin(uid))) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lang = ["lo", "th", "en"].includes(body?.lang) ? body.lang : "lo";

    const safe = messages.slice(-20).map((m: any) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: typeof m?.content === "string" ? m.content.slice(0, 4000) : "",
    })).filter((m: any) => m.content);

    const stats = await gatherStats();
    const system = SYSTEM_PROMPT(lang, stats);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...safe],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      return new Response(JSON.stringify({ error: text || "AI gateway error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});