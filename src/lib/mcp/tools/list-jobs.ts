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
  name: "list_jobs",
  title: "List jobs",
  description: "List public jobs on WorkDay33. Optionally filter by status (active, accepted, completed) or by district. Returns up to `limit` rows (default 20, max 50).",
  inputSchema: {
    status: z.enum(["active", "accepted", "completed", "cancelled"]).optional().describe("Filter by job status."),
    district: z.string().optional().describe("Filter by district id."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, district, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("jobs_public").select("*").order("created_at", { ascending: false }).limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    if (district) q = q.eq("district", district);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { jobs: data } };
  },
});