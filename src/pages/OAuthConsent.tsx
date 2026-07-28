import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";

type AuthDetails = {
  client?: { name?: string; client_uri?: string };
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Beta @supabase/supabase-js oauth namespace — typed locally.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full">
          <h1 className="text-lg font-semibold mb-2">Could not load this authorization request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an application";

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-6 max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Connect {clientName} to WorkDay33</h1>
            {userEmail && <p className="text-xs text-muted-foreground">Signed in as {userEmail}</p>}
          </div>
        </div>

        <p className="text-sm">
          This lets <strong>{clientName}</strong> use WorkDay33 as you — it can call the app's tools
          on your behalf (browse jobs, read your profile and coin balance, list your jobs).
        </p>
        <p className="text-xs text-muted-foreground">
          It does not bypass WorkDay33's permissions or database rules. You can revoke access any time.
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </Card>
    </main>
  );
}