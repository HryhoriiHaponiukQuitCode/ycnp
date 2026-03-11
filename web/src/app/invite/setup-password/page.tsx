"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function InviteSetupPasswordPage() {
  return (
    <Suspense fallback={<InviteSetupPasswordFallback />}>
      <InviteSetupPasswordInner />
    </Suspense>
  );
}

function InviteSetupPasswordFallback() {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm p-8 space-y-6 text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-orange-600" />
        <h1 className="text-2xl font-semibold text-stone-900">Finish your invite</h1>
        <p className="text-sm text-stone-600">Preparing your invite…</p>
      </div>
    </div>
  );
}

function InviteSetupPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("Preparing your invite…");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setStatus("ready");
        setMessage("Set your password to finish joining the organization.");
      }
    }

    checkSession();

    const timeout = window.setTimeout(() => {
      if (!active) return;
      setStatus((current) => {
        if (current === "loading") {
          setMessage("Invite session not found. Open the newest invite email and try again.");
          return "error";
        }
        return current;
      });
    }, 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      setStatus("ready");
      setMessage("Set your password to finish joining the organization.");
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("saving");
    setMessage("Saving your password…");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setMessage(updateError.message);
      return;
    }

    const { error: acceptError } = await supabase.rpc("accept_org_invite", { p_token: token });
    if (acceptError) {
      setStatus("error");
      setMessage(acceptError.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Finish your invite</h1>
          <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-stone-600"}>{message}</p>
        </div>

        {status === "loading" ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={status !== "ready" && status !== "error"}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
              Set password and join
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
