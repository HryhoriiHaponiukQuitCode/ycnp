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
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setOrganizations([]);
      setOrganization(null);
      setLoading(false);
      return;
    }

    const [{ data: isSuperAdmin }, { data: userOrgIds }] = await Promise.all([
      supabase.rpc("is_super_admin"),
      supabase.rpc("get_user_org_ids"),
    ]);

    let orgs: Organization[] = [];

    if (isSuperAdmin) {
      const { data } = await supabase.from("organizations").select("*").order("name");
      orgs = (data || []) as Organization[];
    } else if (userOrgIds?.length) {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .in("id", userOrgIds)
        .order("name");
      orgs = (data || []) as Organization[];
    }

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

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      loadOrgs();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
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
