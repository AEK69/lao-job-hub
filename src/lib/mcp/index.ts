import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listJobs from "./tools/list-jobs";
import getJob from "./tools/get-job";
import getMe from "./tools/get-me";
import listMyJobs from "./tools/list-my-jobs";

// Direct Supabase issuer (never the .lovable.cloud proxy). Read the project ref
// at build time so this module stays import-safe (no runtime env access).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "workday33-mcp",
  title: "WorkDay33",
  version: "0.1.0",
  instructions:
    "Tools for WorkDay33 (ວຽກດ່ວນ), a Lao job marketplace. Use `list_jobs` to browse public jobs, `get_job` for full details, `get_me` for the signed-in user's profile and coin balance, and `list_my_jobs` for the user's posted/accepted jobs. All tools act as the signed-in user under RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listJobs, getJob, getMe, listMyJobs],
});