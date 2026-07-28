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
  name: "get_job",
  title: "Get job",
  description: "Fetch a single job by id. Full sensitive fields visible only to owner / assigned worker / admin per RLS.",
  inputSchema: { id: z.string().uuid().describe("Job id (uuid).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx).from("jobs").select("*").eq("id", id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      const pub = await sb(ctx).from("jobs_public").select("*").eq("id", id).maybeSingle();
      if (pub.error) return { content: [{ type: "text", text: pub.error.message }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(pub.data) }], structuredContent: { job: pub.data } };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { job: data } };
  },
});