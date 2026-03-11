"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { cn } from "@/lib/utils";
import { useResizableColumns, type ColumnDef } from "@/hooks/use-resizable-columns";
import { Search, Loader2 } from "lucide-react";

const SOL_COLUMNS: ColumnDef[] = [
  { key: "name", initialWidth: 180, minWidth: 100 },
  { key: "email", initialWidth: 200, minWidth: 100 },
  { key: "phone", initialWidth: 140, minWidth: 80 },
  { key: "title", initialWidth: 160, minWidth: 80 },
  { key: "active", initialWidth: 100, minWidth: 60 },
  { key: "letter_sig", initialWidth: 160, minWidth: 80 },
  { key: "sig_title", initialWidth: 160, minWidth: 80 },
  { key: "fiscal_year", initialWidth: 120, minWidth: 80 },
  { key: "donors", initialWidth: 90, minWidth: 60 },
  { key: "moves_needed", initialWidth: 120, minWidth: 70 },
  { key: "moves_sched", initialWidth: 130, minWidth: 70 },
  { key: "moves_comp", initialWidth: 130, minWidth: 70 },
  { key: "completion", initialWidth: 130, minWidth: 80 },
];

const SOL_HEADERS = [
  "Name", "Email", "Phone", "Title", "Active", "Letter Signature",
  "Signature Title", "Fiscal Year", "Donors", "Moves Needed",
  "Moves Scheduled", "Moves Completed", "Completion %",
];

export default function SolicitorsPage() {
  const { organization } = useOrganization();
  const [solicitors, setSolicitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const loadSolicitors = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    const { data } = await supabase
      .from("v_solicitor_summary")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name");

    let filtered = data || [];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q)
      );
    }

    setSolicitors(filtered);
    setLoading(false);
  }, [organization, search]);

  useEffect(() => {
    loadSolicitors();
  }, [loadSolicitors]);

  const fmt = (v: unknown) => {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  const { widths, onMouseDown } = useResizableColumns(SOL_COLUMNS);
  const thBase = "dm-table-head-cell sticky top-0 z-20 relative select-none";
  const thFirst = "dm-table-head-cell dm-table-head-cell-sticky sticky top-0 z-30 relative select-none";
  const resizeHandle = "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400/60 active:bg-orange-500/80 z-40";
  const tdBase = "dm-table-cell overflow-hidden text-ellipsis";

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Team</h1>
          <p className="text-stone-500 text-sm">
            {solicitors.length} assignable team member{solicitors.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Manage Team
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members by name, email, or title..."
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="dm-table-shell">
        <div className="dm-table-scroll h-full">
          <table className="dm-table" style={{ minWidth: widths.reduce((a, b) => a + b, 0) }}>
            <thead>
              <tr>
                {SOL_HEADERS.map((label, i) => (
                  <th
                    key={SOL_COLUMNS[i].key}
                    className={cn(i === 0 ? thFirst : thBase, i === SOL_HEADERS.length - 1 && "dm-table-head-cell-last")}
                    style={{ width: widths[i], minWidth: SOL_COLUMNS[i].minWidth }}
                  >
                    <div className="flex h-full items-center">{label}</div>
                    <div className={resizeHandle} onMouseDown={(e) => onMouseDown(i, e)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="dm-table-empty">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                  </td>
                </tr>
              ) : solicitors.length === 0 ? (
                <tr>
                  <td colSpan={13} className="dm-table-empty">
                    {search ? "No team members match your search" : "No assignable team members yet. Invite admins or solicitors first."}
                  </td>
                </tr>
              ) : (
                solicitors.map((sol) => (
                  <tr key={sol.id} className="dm-table-row group">
                    <td className="dm-table-cell dm-table-cell-sticky overflow-hidden text-ellipsis" style={{ width: widths[0], maxWidth: widths[0] }}>
                      <span className="font-medium text-stone-800">{sol.name}</span>
                    </td>
                    <td className={cn("px-4 py-3", tdBase)} style={{ width: widths[1], maxWidth: widths[1] }}>
                      {sol.email ? (
                        <a href={`mailto:${sol.email}`} className="text-stone-700 hover:text-orange-600 underline-offset-2 hover:underline">{sol.email}</a>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3", tdBase)} style={{ width: widths[2], maxWidth: widths[2] }}>
                      {sol.phone ? (
                        <a href={`tel:${sol.phone}`} className="text-stone-700 hover:text-orange-600 underline-offset-2 hover:underline">{sol.phone}</a>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[3], maxWidth: widths[3] }}>{fmt(sol.title)}</td>
                    <td className={cn("px-4 py-3 text-center", tdBase)} style={{ width: widths[4], maxWidth: widths[4] }}>
                      {sol.is_active ? (
                        <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-500 text-xs font-medium rounded-full">Inactive</span>
                      )}
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[5], maxWidth: widths[5] }}>{fmt(sol.letter_signature)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[6], maxWidth: widths[6] }}>{fmt(sol.letter_signature_title)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[7], maxWidth: widths[7] }}>{fmt(sol.fiscal_year_label)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[8], maxWidth: widths[8] }}>{fmt(sol.donor_count)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[9], maxWidth: widths[9] }}>{fmt(sol.total_moves_needed)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[10], maxWidth: widths[10] }}>{fmt(sol.moves_scheduled)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[11], maxWidth: widths[11] }}>{fmt(sol.moves_completed)}</td>
                    <td className="dm-table-cell dm-table-cell-last text-center whitespace-nowrap" style={{ width: widths[12], maxWidth: widths[12] }}>
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, sol.completion_percentage || 0)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-stone-600 w-8 text-right">{Math.round(sol.completion_percentage || 0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
