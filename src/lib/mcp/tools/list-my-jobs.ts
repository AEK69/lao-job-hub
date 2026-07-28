import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_jobs",
  title: "List my jobs",
  description: "List jobs the signed-in user posted or is working on. `role` filters between 'posted' (as employer) and 'working' (as worker).",
  inputSchema: {
    role: z.enum(["posted", "working", "all"]).optional().describe("Which side of the job to filter on (default 'all')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ role }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const uid = ctx.getUserId();
    const client = sb(ctx);
    const r = role ?? "all";
    let q = client.from("jobs").select("*").order("created_at", { ascending: false }).limit(50);
    if (r === "posted") q = q.eq("user_id", uid);
    else if (r === "working") q = q.eq("worker_id", uid);
    else q = q.or(`user_id.eq.${uid},worker_id.eq.${uid}`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { jobs: data } };
  },
});