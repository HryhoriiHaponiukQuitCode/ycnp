"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatCurrency, getGenerosityColor, cn } from "@/lib/utils";
import { useResizableColumns, type ColumnDef } from "@/hooks/use-resizable-columns";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 25;

const DONOR_COLUMNS: ColumnDef[] = [
  { key: "name", initialWidth: 180, minWidth: 100 },
  { key: "first_name", initialWidth: 120, minWidth: 80 },
  { key: "last_name", initialWidth: 120, minWidth: 80 },
  { key: "email", initialWidth: 200, minWidth: 100 },
  { key: "mobile_phone", initialWidth: 140, minWidth: 80 },
  { key: "city", initialWidth: 120, minWidth: 60 },
  { key: "state", initialWidth: 80, minWidth: 50 },
  { key: "generosity", initialWidth: 110, minWidth: 70 },
  { key: "wealth_capacity", initialWidth: 140, minWidth: 80 },
  { key: "ask_goal", initialWidth: 120, minWidth: 80 },
  { key: "current_donor", initialWidth: 120, minWidth: 80 },
  { key: "recent_major", initialWidth: 160, minWidth: 80 },
  { key: "major_amount", initialWidth: 160, minWidth: 80 },
  { key: "past_donor", initialWidth: 110, minWidth: 70 },
  { key: "five_years", initialWidth: 130, minWidth: 70 },
  { key: "long_term", initialWidth: 160, minWidth: 80 },
  { key: "recent_1000", initialWidth: 160, minWidth: 80 },
  { key: "parent", initialWidth: 90, minWidth: 60 },
  { key: "grandparent", initialWidth: 110, minWidth: 70 },
  { key: "alumni", initialWidth: 90, minWidth: 60 },
  { key: "board_member", initialWidth: 120, minWidth: 70 },
  { key: "donor_fund", initialWidth: 170, minWidth: 80 },
  { key: "capacity_score", initialWidth: 130, minWidth: 70 },
  { key: "hunch", initialWidth: 90, minWidth: 60 },
  { key: "prospect_subtotal", initialWidth: 140, minWidth: 80 },
  { key: "total_score", initialWidth: 110, minWidth: 70 },
  { key: "moves_needed", initialWidth: 130, minWidth: 70 },
  { key: "moves_scheduled", initialWidth: 140, minWidth: 80 },
  { key: "moves_completed", initialWidth: 140, minWidth: 80 },
  { key: "fiscal_year", initialWidth: 140, minWidth: 80 },
  { key: "solicitor", initialWidth: 140, minWidth: 80 },
];

export default function DonorsPage() {
  const { organization } = useOrganization();
  const [donors, setDonors] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  const loadDonors = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    let query = supabase
      .from("v_donor_summary")
      .select("*", { count: "exact" })
      .eq("organization_id", organization.id)
      .order("total_score", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setDonors(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [organization, page, search]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatNullableValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const { widths, onMouseDown } = useResizableColumns(DONOR_COLUMNS);

  const thBase = "text-left font-medium text-stone-600 whitespace-nowrap sticky top-0 z-20 bg-stone-100 border-b border-r border-stone-200 relative select-none";
  const thFirst = "text-left font-medium text-stone-600 whitespace-nowrap sticky top-0 left-0 z-30 bg-stone-100 border-b border-r border-stone-200 relative select-none";
  const tdBase = "whitespace-nowrap border-b border-r border-stone-200 overflow-hidden text-ellipsis";
  const resizeHandle = "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400/60 active:bg-orange-500/80 z-40";

  const HEADER_LABELS = [
    "Name", "First Name", "Last Name", "Email", "Mobile Phone", "City", "State",
    "Generosity", "Wealth Capacity", "Ask Goal", "Current Donor", "Recent Major Donation",
    "Major Donation Amount", "Past Donor", "Five Years In Row", "Long-term Commitment",
    "Recent $1000 Donation", "Parent", "Grandparent", "Alumni", "Board Member",
    "Donor Fund Foundation", "Capacity Score", "Hunch", "Prospect Subtotal", "Total Score",
    "Moves Needed", "Moves Scheduled", "Moves Completed", "Fiscal Year Label", "Solicitor",
  ];

  return (
  <div className="w-full h-[calc(100vh-5rem)] flex flex-col gap-4">
  <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Donors</h1>
          <p className="text-stone-500 text-sm">{totalCount} donors total</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Donor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search donors by name, email, or city..."
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <div className="overflow-auto overscroll-none h-full border border-stone-200 bg-white">
          <table className="w-full text-sm border-separate border-spacing-0" style={{ minWidth: widths.reduce((a, b) => a + b, 0) }}>
            <thead>
              <tr>
                {HEADER_LABELS.map((label, i) => (
                  <th
                    key={DONOR_COLUMNS[i].key}
                    className={i === 0 ? thFirst : thBase}
                    style={{ width: widths[i], minWidth: DONOR_COLUMNS[i].minWidth }}
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
                  <td colSpan={31} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                  </td>
                </tr>
              ) : donors.length === 0 ? (
                <tr>
                  <td colSpan={31} className="px-4 py-12 text-center text-stone-400">
                    {search ? "No donors match your search" : "No donors yet. Add your first donor!"}
                  </td>
                </tr>
              ) : (
                donors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-white border-b border-r border-stone-200 overflow-hidden text-ellipsis" style={{ width: widths[0], maxWidth: widths[0] }}>
                      <Link href={`/dashboard/donors/${donor.id}`} className="font-medium text-stone-900 hover:text-orange-600 transition-colors">
                        {formatNullableValue(donor.name)}
                      </Link>
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[1], maxWidth: widths[1] }}>{formatNullableValue(donor.first_name)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[2], maxWidth: widths[2] }}>{formatNullableValue(donor.last_name)}</td>
                    <td className={cn("px-4 py-3", tdBase)} style={{ width: widths[3], maxWidth: widths[3] }}>
                      {donor.email ? (
                        <a href={`mailto:${donor.email}`} className="text-stone-700 hover:text-orange-600 underline-offset-2 hover:underline">{donor.email}</a>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3", tdBase)} style={{ width: widths[4], maxWidth: widths[4] }}>
                      {donor.mobile_phone ? (
                        <a href={`tel:${donor.mobile_phone}`} className="text-stone-700 hover:text-orange-600 underline-offset-2 hover:underline">{donor.mobile_phone}</a>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[5], maxWidth: widths[5] }}>{formatNullableValue(donor.city)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[6], maxWidth: widths[6] }}>{formatNullableValue(donor.state)}</td>
                    <td className={cn("px-4 py-3 text-center", tdBase)} style={{ width: widths[7], maxWidth: widths[7] }}>
                      {donor.generosity_score ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getGenerosityColor(donor.generosity_score)}`}>{donor.generosity_score}</span>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[8], maxWidth: widths[8] }}>{formatNullableValue(donor.wealth_capacity)}</td>
                    <td className={cn("px-4 py-3 text-right text-stone-900", tdBase)} style={{ width: widths[9], maxWidth: widths[9] }}>{donor.ask_goal ? formatCurrency(donor.ask_goal) : ""}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[10], maxWidth: widths[10] }}>{formatNullableValue(donor.is_current_donor)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[11], maxWidth: widths[11] }}>{formatNullableValue(donor.recent_major_donation)}</td>
                    <td className={cn("px-4 py-3 text-right text-stone-600", tdBase)} style={{ width: widths[12], maxWidth: widths[12] }}>{formatNullableValue(donor.major_donation_amount)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[13], maxWidth: widths[13] }}>{formatNullableValue(donor.is_past_donor)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[14], maxWidth: widths[14] }}>{formatNullableValue(donor.five_years_in_row)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[15], maxWidth: widths[15] }}>{formatNullableValue(donor.long_term_commitment)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[16], maxWidth: widths[16] }}>{formatNullableValue(donor.recent_1000_donation)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[17], maxWidth: widths[17] }}>{formatNullableValue(donor.is_parent)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[18], maxWidth: widths[18] }}>{formatNullableValue(donor.is_grandparent)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[19], maxWidth: widths[19] }}>{formatNullableValue(donor.is_alumni)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[20], maxWidth: widths[20] }}>{formatNullableValue(donor.is_board_member)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[21], maxWidth: widths[21] }}>{formatNullableValue(donor.donor_fund_foundation)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[22], maxWidth: widths[22] }}>{formatNullableValue(donor.capacity_score)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[23], maxWidth: widths[23] }}>{formatNullableValue(donor.hunch)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[24], maxWidth: widths[24] }}>{formatNullableValue(donor.prospect_subtotal)}</td>
                    <td className={cn("px-4 py-3 text-center", tdBase)} style={{ width: widths[25], maxWidth: widths[25] }}>
                      <span className="font-semibold text-stone-900">{formatNullableValue(donor.total_score)}</span>
                    </td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[26], maxWidth: widths[26] }}>{formatNullableValue(donor.moves_needed)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[27], maxWidth: widths[27] }}>{formatNullableValue(donor.moves_scheduled)}</td>
                    <td className={cn("px-4 py-3 text-center text-stone-600", tdBase)} style={{ width: widths[28], maxWidth: widths[28] }}>{formatNullableValue(donor.moves_completed)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[29], maxWidth: widths[29] }}>{formatNullableValue(donor.fiscal_year_label)}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap border-b border-stone-200 overflow-hidden text-ellipsis" style={{ width: widths[30], maxWidth: widths[30] }}>
                      {formatNullableValue(donor.solicitor_name)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
            <span className="text-xs text-stone-600">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Donor Modal */}
      {showAddModal && (
        <AddDonorModal
          organizationId={organization?.id || ""}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadDonors();
          }}
        />
      )}
    </div>
  );
}

function AddDonorModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    primary_phone: "",
    mobile_phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("donors").insert({
      ...formData,
      organization_id: organizationId,
    });

    if (!error) {
      onCreated();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold">Add New Donor</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Display Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. John and Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Primary Phone</label>
              <input
                type="text"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Mobile Phone</label>
              <input
                type="text"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Zip</label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Donor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
