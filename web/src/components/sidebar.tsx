"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { YCLogo } from "@/components/yc-logo";
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/donors", label: "Donors", icon: Users },
  { href: "/dashboard/moves", label: "Moves", icon: ArrowRightLeft },
  { href: "/dashboard/move-ideas", label: "Move Ideas", icon: Lightbulb },
  { href: "/dashboard/solicitors", label: "Solicitors", icon: UserCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { organization, organizations, setOrganization } = useOrganization();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setIsSuperAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("is_super_admin");
      if (!cancelled) setIsSuperAdmin(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-stone-900 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <YCLogo className="w-6 h-6" alt="YC" />
          <span className="text-lg font-bold text-white tracking-tight">
            Donor<span className="text-orange-500">Mind</span>
          </span>
        </div>
        <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-0.5">
          Relationship Intelligence
        </p>
      </div>

      {/* Org Switcher */}
      {organizations.length > 0 && (
        <div className="px-3 py-3 border-b border-stone-800 relative">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-stone-300 hover:text-white rounded-md hover:bg-stone-800 transition-colors"
          >
            <span className="truncate text-xs font-medium">
              {organization?.name || "Select Org"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
          {orgDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-stone-800 rounded-lg shadow-lg border border-stone-700 z-50 py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setOrganization(org);
                    setOrgDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    org.id === organization?.id
                      ? "text-orange-400 bg-stone-700/50"
                      : "text-stone-400 hover:text-white hover:bg-stone-700/30"
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
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-0.5 px-2">
          {[...navItems, ...(isSuperAdmin ? [{ href: "/dashboard/super-admin", label: "Super Admin", icon: UserCog }] : [])].map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "text-white bg-orange-600/20 border-l-2 border-orange-500"
                    : "text-stone-400 hover:text-white hover:bg-stone-800 border-l-2 border-transparent"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-stone-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 w-full text-sm text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
