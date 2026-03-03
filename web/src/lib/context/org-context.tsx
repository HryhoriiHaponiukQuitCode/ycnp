"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

type Organization = Tables<"organizations">;

interface OrgContextValue {
  organization: Organization | null;
  organizations: Organization[];
  setOrganization: (org: Organization) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue>({
  organization: null,
  organizations: [],
  setOrganization: () => {},
  loading: true,
  refreshOrganizations: async () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadOrgs = async () => {
    // Only load orgs the authenticated user is a member of.
    // This avoids exposing all organizations to any signed-in user.
    const { data } = await supabase
      .from("org_members")
      .select("organizations(*)")
      .order("created_at", { ascending: false });

    const rawOrgs = (data || [])
      .map((row: any) => row.organizations)
      .filter(Boolean) as Organization[];

    // Defensive: if the join returns duplicates (or org_members has duplicates),
    // ensure org IDs are unique to avoid React key collisions.
    const orgMap = new Map<string, Organization>();
    for (const org of rawOrgs) {
      if (!orgMap.has(org.id)) orgMap.set(org.id, org);
    }
    const orgs = Array.from(orgMap.values());

    orgs.sort((a, b) => a.name.localeCompare(b.name));

    if (orgs.length > 0) {
      setOrganizations(orgs);
      // Try to load saved org from localStorage
      const savedOrgId = localStorage.getItem("current_org_id");
      const savedOrg = orgs.find((o) => o.id === savedOrgId);
      setOrganization(savedOrg || orgs[0]);
    } else {
      setOrganizations([]);
      setOrganization(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const handleSetOrganization = (org: Organization) => {
    setOrganization(org);
    localStorage.setItem("current_org_id", org.id);
  };

  return (
    <OrgContext.Provider
      value={{
        organization,
        organizations,
        setOrganization: handleSetOrganization,
        loading,
        refreshOrganizations: loadOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrgProvider");
  }
  return context;
}
