"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatDate, generateSlug } from "@/lib/utils";
import { Loader2, Plus, Mail, X } from "lucide-react";

type InviteDraft = {
  id: string;
  email: string;
  role: string;
};

export default function SuperAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const { refreshOrganizations } = useOrganization();

  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [createError, setCreateError] = useState("");

  const [invites, setInvites] = useState<InviteDraft[]>(() => [
    { id: crypto.randomUUID(), email: "", role: "viewer" },
  ]);

  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (!orgName.trim()) return false;
    const nonEmptyInvites = invites.filter((i) => i.email.trim().length > 0);
    return nonEmptyInvites.every((i) => /.+@.+\..+/.test(i.email.trim()));
  }, [orgName, invites]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setChecking(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login?next=/dashboard/super-admin");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("is_super_admin");
      if (cancelled) return;

      if (rpcError) {
        setError(rpcError.message);
        setIsSuperAdmin(false);
        setChecking(false);
        return;
      }

      setIsSuperAdmin(Boolean(data));
      setChecking(false);
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    let cancelled = false;

    async function loadOrgs() {
      setOrgsLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setOrgs([]);
      } else {
        setOrgs(data || []);
      }
      setOrgsLoading(false);
    }

    loadOrgs();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, supabase]);

  async function handleCreateOrg() {
    setCreateError("");
    setError("");

    const name = orgName.trim();
    if (!name) {
      setCreateError("Enter organization name");
      return;
    }

    setCreating(true);
    const slug = generateSlug(name);

    const { data: orgJson, error: createOrgError } = await supabase.rpc("create_organization", {
      name,
      slug,
    });

    if (createOrgError) {
      setCreateError(createOrgError.message);
      setCreating(false);
      return;
    }

    const newOrgId = orgJson?.id as string | undefined;

    // Create + send invites (best-effort). If some fail, we’ll show a message.
    const inviteRows = invites
      .map((i) => ({ ...i, email: i.email.trim().toLowerCase() }))
      .filter((i) => i.email.length > 0);

    const inviteErrors: string[] = [];

    if (newOrgId && inviteRows.length > 0) {
      for (const inv of inviteRows) {
        const { data: invite, error: inviteRpcError } = await supabase.rpc("create_org_invite", {
          p_organization_id: newOrgId,
          p_email: inv.email,
          p_role: inv.role,
        });

        if (inviteRpcError || !invite) {
          inviteErrors.push(`${inv.email}: ${inviteRpcError?.message || "failed to create invite"}`);
          continue;
        }

        const origin = window.location.origin;
        const nextPath = `/invite/accept?token=${encodeURIComponent(invite.token)}`;
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: inv.email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (otpError) {
          inviteErrors.push(`${inv.email}: ${otpError.message}`);
        }
      }
    }

    // Reload org lists
    await refreshOrganizations();

    // Refresh admin org list too
    const { data: allOrgs } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    setOrgs(allOrgs || []);

    setOrgName("");
    setInvites([{ id: crypto.randomUUID(), email: "", role: "viewer" }]);
    setCreating(false);

    if (inviteErrors.length > 0) {
      alert(`Organization created, but some invites failed:\n\n${inviteErrors.join("\n")}`);
    } else if (inviteRows.length > 0) {
      alert("Organization created and invites sent.");
    } else {
      alert("Organization created.");
    }
  }

  function closeCreateOrgModal() {
    if (creating) return;
    setCreateOrgOpen(false);
  }

  if (checking) {
    return (
      <div className="w-full py-16 px-6">
        <div className="flex items-center gap-3 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
          <p className="text-sm">Checking super admin access…</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="w-full py-16 px-6 space-y-3">
        <h1 className="text-2xl font-bold text-stone-900">Super Admin</h1>
        <p className="text-stone-600">Access denied.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Organizations</h1>
          <p className="text-sm text-stone-500">Create organizations and invite users to join.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setError("");
            setCreateOrgOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Create organization modal */}
      {createOrgOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Create organization"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeCreateOrgModal();
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeCreateOrgModal} />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Create Organization</h2>
                  <p className="text-sm text-stone-500">Add an organization and optionally invite users.</p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateOrgModal}
                  className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Organization name</label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="E.g., Helping Hands Foundation"
                    autoFocus
                  />
                  {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-stone-700 inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Invite users (optional)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setInvites((prev) => [...prev, { id: crypto.randomUUID(), email: "", role: "viewer" }])}
                      className="text-sm text-orange-700 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {invites.map((inv, idx) => (
                      <div key={inv.id} className="flex gap-2">
                        <input
                          type="email"
                          value={inv.email}
                          onChange={(e) =>
                            setInvites((prev) => prev.map((p) => (p.id === inv.id ? { ...p, email: e.target.value } : p)))
                          }
                          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="person@example.com"
                        />
                        <select
                          value={inv.role}
                          onChange={(e) =>
                            setInvites((prev) => prev.map((p) => (p.id === inv.id ? { ...p, role: e.target.value } : p)))
                          }
                          className="w-28 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="solicitor">Solicitor</option>
                          <option value="admin">Admin</option>
                        </select>
                        {invites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInvites((prev) => prev.filter((p) => p.id !== inv.id))}
                            className="px-3 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50"
                            aria-label={`Remove invite ${idx + 1}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateOrgModal}
                    disabled={creating}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleCreateOrg();
                      // If creation succeeded, `creating` will end and fields reset; close then.
                      // We close unconditionally after the action completes to match desired UX.
                      setCreateOrgOpen(false);
                    }}
                    disabled={creating || !canSubmit}
                    className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orgs table — grid-border style matching other tables */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-base font-semibold text-stone-900">All Organizations</h2>
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{orgs.length} total</span>
        </div>

        {orgsLoading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-stone-600">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <p className="text-sm">Loading organizations…</p>
          </div>
        ) : (
          <div className="overflow-auto border border-stone-200 bg-white">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Website</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-stone-200">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-900 whitespace-nowrap border-b border-r border-stone-200">{o.name}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap border-b border-r border-stone-200">
                      {o.website ? (
                        <a href={o.website} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:text-orange-600 underline-offset-2 hover:underline">{o.website}</a>
                      ) : ""}
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap border-b border-stone-200">{o.created_at ? formatDate(o.created_at) : ""}</td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-stone-400 border-b border-stone-200">No organizations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
