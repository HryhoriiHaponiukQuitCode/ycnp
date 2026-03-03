"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteFallback />}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-orange-600" />
        <h1 className="text-xl font-semibold text-stone-900">Organization invite</h1>
        <p className="text-sm text-stone-600">Loading…</p>
      </div>
    </div>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshOrganizations } = useOrganization();

  const [status, setStatus] = useState<"working" | "error" | "done">("working");
  const [message, setMessage] = useState<string>("Accepting invite…");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    const supabase = createClient();

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = `/invite/accept?token=${encodeURIComponent(token)}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error } = await supabase.rpc("accept_org_invite", { p_token: token });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      // Refresh org list and redirect into the app
      await refreshOrganizations();
      setStatus("done");
      setMessage("Invite accepted. Redirecting…");

      // Optionally we could also persist current_org_id here, but org-context will pick it up.
      router.replace("/dashboard");
    })();
  }, [router, searchParams, refreshOrganizations]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
        {status === "working" && <Loader2 className="w-6 h-6 mx-auto animate-spin text-orange-600" />}
        <h1 className="text-xl font-semibold text-stone-900">Organization invite</h1>
        <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-stone-600"}>{message}</p>
      </div>
    </div>
  );
}
