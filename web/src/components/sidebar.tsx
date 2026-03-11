"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Lightbulb,
  UserCheck,
  UserCog,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useEffect } from "react";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/donors", label: "Donors", icon: Users },
  { href: "/dashboard/moves", label: "Moves", icon: ArrowRightLeft },
  { href: "/dashboard/move-ideas", label: "Move Ideas", icon: Lightbulb },
  { href: "/dashboard/solicitors", label: "Team", icon: UserCheck },
];

const systemNavItems = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { organization, organizations, setOrganization } = useOrganization();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) {
          setIsSuperAdmin(false);
          setCanManageSettings(false);
        }
        return;
      }

      const [{ data: superAdminData }, { data: orgAdminData }] = await Promise.all([
        supabase.rpc("is_super_admin"),
        organization ? supabase.rpc("is_org_admin", { org_id: organization.id }) : Promise.resolve({ data: false } as const),
      ]);

      if (!cancelled) {
        setIsSuperAdmin(Boolean(superAdminData));
        setCanManageSettings(Boolean(superAdminData || orgAdminData));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-stone-950 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/5">
        <div className="flex items-center">
          <span className="text-lg font-bold text-white tracking-tight">
            Donor<span className="text-orange-500">Mind</span>
          </span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.24em] text-white">
          Relationship Intelligence
        </p>
      </div>

      {/* Org Switcher */}
      {organizations.length > 0 && (
        <div className="px-3 py-3 border-b border-white/5 relative">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3 text-left text-sm text-stone-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
              {(organization?.name || "O").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-50">
                {organization?.name || "Select Org"}
              </div>
              <div className="text-xs text-stone-400">Workspace</div>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-stone-400" />
          </button>
          {orgDropdownOpen && (
            <div className="absolute left-3 right-3 top-full z-50 mt-2 rounded-xl border border-stone-800 bg-stone-900 py-1 shadow-lg">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setOrganization(org);
                    setOrgDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs transition-colors",
                    org.id === organization?.id
                      ? "bg-orange-500/10 text-orange-300"
                      : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Main
          </div>
          {mainNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-orange-500/10 text-orange-400 before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-sm before:bg-orange-500"
                    : "text-stone-400 hover:bg-white/[0.04] hover:text-stone-200"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", isActive ? "opacity-100" : "opacity-70")} />
                {item.label}
              </Link>
            );
          })}

          <div className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            System
          </div>
          {[...(canManageSettings ? systemNavItems : []), ...(isSuperAdmin ? [{ href: "/dashboard/super-admin", label: "Super Admin", icon: UserCog }] : [])].map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-orange-500/10 text-orange-400 before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-sm before:bg-orange-500"
                    : "text-stone-400 hover:bg-white/[0.04] hover:text-stone-200"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", isActive ? "opacity-100" : "opacity-70")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
