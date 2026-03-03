"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { cn } from "@/lib/utils";
import { useResizableColumns, type ColumnDef } from "@/hooks/use-resizable-columns";
import {
  Search,
  Plus,
  Loader2,
  X,
} from "lucide-react";

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
  const [showAddModal, setShowAddModal] = useState(false);
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
  const thBase = "text-left font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200 relative select-none";
  const thFirst = "text-left font-medium text-stone-600 whitespace-nowrap sticky top-0 left-0 z-30 bg-stone-100 border-b border-r border-stone-200 relative select-none";
  const resizeHandle = "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400/60 active:bg-orange-500/80 z-40";
  const tdBase = "whitespace-nowrap border-b border-r border-stone-200 overflow-hidden text-ellipsis";

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Solicitors</h1>
          <p className="text-stone-500 text-sm">
            {solicitors.length} solicitor{solicitors.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Solicitor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search solicitors by name, email, or title..."
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <div className="overflow-auto overscroll-none h-full border border-stone-200 bg-white">
          <table className="w-full text-sm border-separate border-spacing-0" style={{ minWidth: widths.reduce((a, b) => a + b, 0) }}>
            <thead>
              <tr>
                {SOL_HEADERS.map((label, i) => (
                  <th
                    key={SOL_COLUMNS[i].key}
                    className={i === 0 ? thFirst : (i === SOL_HEADERS.length - 1 ? thBase.replace("border-r ", "") : thBase)}
                    style={{ width: widths[i], minWidth: SOL_COLUMNS[i].minWidth }}
                  >
                    <div className="px-4 py-3">{label}</div>
                    <div className={resizeHandle} onMouseDown={(e) => onMouseDown(i, e)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                  </td>
                </tr>
              ) : solicitors.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-stone-400">
                    {search ? "No solicitors match your search" : "No solicitors yet. Add your team members!"}
                  </td>
                </tr>
              ) : (
                solicitors.map((sol) => (
                  <tr key={sol.id} className="hover:bg-stone-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-white border-b border-r border-stone-200 group-hover:bg-stone-50 overflow-hidden text-ellipsis" style={{ width: widths[0], maxWidth: widths[0] }}>
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
                    <td className="px-4 py-3 text-center whitespace-nowrap border-b border-stone-200" style={{ width: widths[12], maxWidth: widths[12] }}>
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

      {showAddModal && (
        <AddSolicitorModal
          organizationId={organization?.id || ""}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadSolicitors();
          }}
        />
      )}
    </div>
  );
}

function AddSolicitorModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    name: "",
    email: "",
    phone: "",
    title: "", // This needs to go into solicitor_fiscal_years potentially, or we need to simplify
  });
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // 1. Create solicitor in 'solicitors' table
    const { data: solData, error } = await supabase
      .from("solicitors")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        organization_id: organizationId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
       console.error("Error creating solicitor:", error);
       alert("Error creating solicitor");
       setSaving(false);
       return;
    }

    // 2. Ideally we should also get the current fiscal year and create a 'solicitor_fiscal_years' record with the title
    // For now, let's keep it simple as the view might need adjustments or we do it later
    // Let's rely on basic creation first.
    
    onCreated();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">New Solicitor</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-stone-100 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Solicitor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
