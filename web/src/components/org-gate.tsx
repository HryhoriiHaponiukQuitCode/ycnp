"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/org-context";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface OrgGateProps {
  children: React.ReactNode;
}

export function OrgGate({ children }: OrgGateProps) {
  const { organization, loading, setOrganization, refreshOrganizations } = useOrganization();
  const supabase = createClient();
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshAuthAndPerms() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      const loggedIn = Boolean(sessionData.session);
      setIsLoggedIn(loggedIn);
      setAuthReady(true);

      if (!loggedIn) {
        setIsSuperAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc("is_super_admin");
      if (cancelled) return;
      if (error) {
        setIsSuperAdmin(false);
        return;
      }
      setIsSuperAdmin(Boolean(data));
    }

    refreshAuthAndPerms();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refreshAuthAndPerms();
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!orgName.trim()) {
      setError("Enter organization name");
      return;
    }

    setCreating(true);
    const slug = generateSlug(orgName.trim());

    const { error: rpcError } = await supabase.rpc("create_organization", {
      name: orgName.trim(),
      slug,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCreating(false);
      return;
    }

    await refreshOrganizations();
    // After refresh, try to set by slug (fresh fetch ensures list populated)
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .single();

    if (orgData) {
      setOrganization(orgData as any);
    }

    setOrgName("");
    setCreating(false);
  }

  const readyForDecision = !loading && authReady && isSuperAdmin !== null;
  const shouldBlock = readyForDecision && !organization;

  return (
    <div className="relative min-h-screen">
      {children}

      {shouldBlock && (
        <div className="fixed inset-0 z-[999] bg-white/95 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-stone-900">Create an organization</h1>
              <p className="text-stone-600 text-sm">
                Add an organization to continue. This full-screen prompt cannot be closed until the organization is created.
              </p>
            </div>

            {!isSuperAdmin ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-stone-700 font-medium">
                  {isLoggedIn ? "You don’t have permission to create organizations." : "You’re not signed in."}
                </p>
                <p className="text-sm text-stone-500">
                  {isLoggedIn
                    ? "Please ask your super admin to create an organization for you, or to add you to an existing one."
                    : "Please sign in again, then try reloading this page."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1">Organization name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Helping Hands Foundation"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create organization
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
