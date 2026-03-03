"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { Loader2, Plus, Save, Trash2, UserCog, Calendar, X } from "lucide-react";
import { formatDate, generateSlug } from "@/lib/utils";

export default function SettingsPage() {
  const { organization, setOrganization, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [orgForm, setOrgForm] = useState({ name: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createOrgName, setCreateOrgName] = useState("");
  const [createError, setCreateError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

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

    if (!organization) {
      return () => {
        cancelled = true;
        subscription.subscription.unsubscribe();
      };
    }

    setOrgForm({
      name: organization.name,
      website: organization.website || "",
    });

    async function loadSettings() {
      if (!organization) return;
      setLoading(true);
      // Load fiscal years
      const { data: fyData } = await supabase
        .from("fiscal_years")
        .select("*")
        .eq("organization_id", organization.id)
        .order("start_date", { ascending: false });
      setFiscalYears(fyData || []);
      // Load members
      const { data: memberData } = await supabase
        .from("org_members")
        .select("*")
        .eq("organization_id", organization.id);
      setMembers(memberData || []);

      const { data: inviteData } = await supabase
        .from("org_invites")
        .select("*")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      setInvites(inviteData || []);
      setLoading(false);
    }
    loadSettings();

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [organization, supabase]);

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;

    setInviteError("");
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Enter an email");
      return;
    }

    setInviting(true);

    const { data: invite, error: inviteRpcError } = await supabase.rpc("create_org_invite", {
      p_organization_id: organization.id,
      p_email: email,
      p_role: inviteRole,
    });

    if (inviteRpcError || !invite) {
      setInviteError(inviteRpcError?.message || "Failed to create invite");
      setInviting(false);
      return;
    }

    const origin = window.location.origin;
    const nextPath = `/invite/accept?token=${encodeURIComponent(invite.token)}`;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (otpError) {
      setInviteError(otpError.message);
      setInviting(false);
      return;
    }

    const { data: inviteData } = await supabase
      .from("org_invites")
      .select("*")
      .eq("organization_id", organization.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    setInvites(inviteData || []);

    setInviteEmail("");
    setInviting(false);

    alert(`Invite sent to ${email}. They will receive a login link by email.`);
  }

  function closeInviteModal() {
    if (inviting) return;
    setInviteModalOpen(false);
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!organization) return;
    if (!confirm("Revoke this invite?")) return;

    const { error } = await supabase
      .from("org_invites")
      .delete()
      .eq("id", inviteId)
      .eq("organization_id", organization.id);

    if (error) {
      alert(error.message);
      return;
    }

    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  async function handleUpdateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("organizations")
      .update({
        name: orgForm.name,
        website: orgForm.website,
      })
      .eq("id", organization.id)
      .select()
      .single();

    if (!error && data) {
      setOrganization(data);
      alert("Organization updated successfully!");
    } else {
      alert("Error updating organization");
    }
    setSaving(false);
  }

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createOrgName.trim()) {
      setCreateError("Enter organization name");
      return;
    }
    setCreatingOrg(true);
    const slug = generateSlug(createOrgName.trim());
    const { error: rpcError } = await supabase.rpc("create_organization", {
      name: createOrgName.trim(),
      slug,
    });

    if (rpcError) {
      setCreateError(rpcError.message);
      setCreatingOrg(false);
      return;
    }

    // Load the newly created organization and set as current
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .single();

    if (orgData) {
      setOrganization(orgData as any);
      setCreateOrgName("");
    }
    setCreatingOrg(false);
  }

  if (orgLoading) {
    return (
      <div className="w-full py-20 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-orange-600 mb-4" />
        <p className="text-lg text-stone-600">Loading organization...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-stone-900">Let’s set up your organization</p>
          <p className="text-stone-600">Create an organization to start using the workspace.</p>
        </div>
        {!authReady || isSuperAdmin === null ? (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex items-center gap-3 text-stone-600">
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            <p className="text-sm">Checking permissions…</p>
          </div>
        ) : !isSuperAdmin ? (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-2">
            <p className="text-sm font-medium text-stone-900">
              {isLoggedIn ? "You don’t have permission to create organizations." : "You’re not signed in."}
            </p>
            <p className="text-sm text-stone-600">
              {isLoggedIn
                ? "Ask your super admin to create an organization or invite you to one."
                : "Please sign in again, then reload this page."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateOrganization} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-900 mb-1">Organization name</label>
              <input
                type="text"
                value={createOrgName}
                onChange={(e) => setCreateOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="E.g., Helping Hands Foundation"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="submit"
              disabled={creatingOrg}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creatingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Organization
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm">Manage your organization preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 flex gap-0">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "general" ? "border-orange-600 text-orange-600" : "border-transparent text-stone-500 hover:text-stone-800"}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("fiscal_years")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "fiscal_years" ? "border-orange-600 text-orange-600" : "border-transparent text-stone-500 hover:text-stone-800"}`}
        >
          Fiscal Years
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "members" ? "border-orange-600 text-orange-600" : "border-transparent text-stone-500 hover:text-stone-800"}`}
        >
          Team Members
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 max-w-2xl">
          <h3 className="text-base font-semibold text-stone-900 mb-4">Organization Details</h3>
          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Website</label>
              <input
                type="url"
                value={orgForm.website}
                onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://example.org"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "fiscal_years" && (
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-base font-semibold text-stone-900">Fiscal Years</h3>
            <button className="text-sm text-orange-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Year
            </button>
          </div>
          <div className="overflow-auto border border-stone-200 bg-white">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Label</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">End Date</th>
                  <th className="text-center px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-stone-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {fiscalYears.map(fy => (
                  <tr key={fy.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap border-b border-r border-stone-200">{fy.label}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap border-b border-r border-stone-200">{formatDate(fy.start_date)}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap border-b border-r border-stone-200">{formatDate(fy.end_date)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap border-b border-stone-200">
                      {fy.is_current ? (
                        <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Current</span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full font-medium">Past</span>
                      )}
                    </td>
                  </tr>
                ))}
                {fiscalYears.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-stone-400 text-sm border-b border-stone-200">No fiscal years configured</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-semibold text-stone-900">Team Members</h2>
            <button
              type="button"
              onClick={() => {
                setInviteError("");
                setInviteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Invite Team Member
            </button>
          </div>

          {/* Invite modal */}
          {inviteModalOpen && (
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Invite team member"
              onKeyDown={(e) => {
                if (e.key === "Escape") closeInviteModal();
              }}
            >
              <div className="absolute inset-0 bg-black/40" onClick={closeInviteModal} />
              <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-auto">
                <div className="w-full max-w-xl bg-white rounded-2xl border border-stone-200 shadow-xl">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">Invite Team Member</h3>
                      <p className="text-sm text-stone-500">Send an email login link to join this organization.</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeInviteModal}
                      className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <form
                      onSubmit={async (e) => {
                        await handleInviteMember(e);
                        // Close only if we didn't set an error (best-effort).
                        // If an error occurs, keep modal open so user can fix.
                        if (!inviteError) setInviteModalOpen(false);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Email address</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="person@example.com"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="solicitor">Solicitor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={closeInviteModal}
                          disabled={inviting}
                          className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={inviting}
                          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Send Invite
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members table */}
          <div>
            <h3 className="text-base font-semibold text-stone-900 px-1 mb-3">Current Members</h3>
            <div className="overflow-auto border border-stone-200 bg-white">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">User ID</th>
                    <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Role</th>
                    <th className="text-right px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-stone-200">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-500 text-xs font-mono whitespace-nowrap border-b border-r border-stone-200">{member.user_id}</td>
                      <td className="px-4 py-3 capitalize text-stone-800 whitespace-nowrap border-b border-r border-stone-200">{member.role}</td>
                      <td className="px-4 py-3 text-right text-stone-500 whitespace-nowrap border-b border-stone-200">{formatDate(member.created_at)}</td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-stone-400 text-sm border-b border-stone-200">No members yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending invites table */}
          <div>
            <h3 className="text-base font-semibold text-stone-900 px-1 mb-3">Pending Invites</h3>
            <div className="overflow-auto border border-stone-200 bg-white">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200">Created</th>
                    <th className="text-right px-4 py-3 font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-stone-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((i) => (
                    <tr key={i.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap border-b border-r border-stone-200">{i.email}</td>
                      <td className="px-4 py-3 text-stone-600 capitalize whitespace-nowrap border-b border-r border-stone-200">{i.role}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap border-b border-r border-stone-200">{i.created_at ? formatDate(i.created_at) : ""}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap border-b border-stone-200">
                        <button onClick={() => handleRevokeInvite(i.id)} className="text-sm text-red-600 hover:underline">Revoke</button>
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-stone-400 text-sm border-b border-stone-200">No pending invites</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
