"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatCurrency, getGenerosityTableTheme, getInitials, cn } from "@/lib/utils";
import { useResizableColumns, type ColumnDef } from "@/hooks/use-resizable-columns";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Layers3,
  Zap,
  DollarSign,
  Activity,
  Funnel,
  MapPin,
  Rows3,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 25;
const GENEROSITY_OPTIONS = ["On Fire!", "Hot", "Warm", "Cool", "Cold", "Not Scanned"];

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
  const [stats, setStats] = useState({
    onFireCount: 0,
    totalCapacity: 0,
    activeThisYear: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGenerosity, setSelectedGenerosity] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCapacities, setSelectedCapacities] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [capacityOptions, setCapacityOptions] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<null | "generosity" | "city" | "capacity">(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
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

    if (selectedGenerosity.length > 0) {
      query = query.in("generosity_score", selectedGenerosity);
    }

    if (selectedCities.length > 0) {
      query = query.in("city", selectedCities);
    }

    if (selectedCapacities.length > 0) {
      query = query.in("wealth_capacity", selectedCapacities);
    }

    const { data, count } = await query;
    setDonors(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [organization, page, search, selectedGenerosity, selectedCities, selectedCapacities]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  useEffect(() => {
    if (!organization) return;

    (async () => {
      const { data } = await supabase
        .from("v_donor_summary")
        .select("ask_goal, generosity_score, is_current_donor, city, wealth_capacity")
        .eq("organization_id", organization.id);

      const nextStats = (data || []).reduce(
        (acc, donor) => {
          if (donor.generosity_score === "On Fire!") acc.onFireCount += 1;
          if (typeof donor.ask_goal === "number") acc.totalCapacity += donor.ask_goal;
          if (typeof donor.is_current_donor === "number" && donor.is_current_donor > 0) acc.activeThisYear += 1;
          return acc;
        },
        { onFireCount: 0, totalCapacity: 0, activeThisYear: 0 }
      );

      setStats(nextStats);
      setCityOptions(
        Array.from(new Set((data || []).map((donor) => donor.city).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))
      );
      setCapacityOptions(
        Array.from(new Set((data || []).map((donor) => donor.wealth_capacity).filter((value): value is string => Boolean(value))))
      );
    })();
  }, [organization, supabase]);

  useEffect(() => {
    setPage(0);
  }, [selectedGenerosity, selectedCities, selectedCapacities]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalCount, (page + 1) * PAGE_SIZE);

  const formatNullableValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const { widths, onMouseDown } = useResizableColumns(DONOR_COLUMNS);

  const thBase = "dm-table-head-cell sticky top-0 z-20 select-none";
  const thFirst = "dm-table-head-cell dm-table-head-cell-sticky sticky top-0 select-none";
  const tdBase = "dm-table-cell overflow-hidden text-ellipsis";
  const resizeHandle = "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400/60 active:bg-orange-500/80 z-40";
  const paginationItems = getPaginationItems(page, totalPages);

  const HEADER_LABELS = [
    "Name", "First Name", "Last Name", "Email", "Mobile Phone", "City", "State",
    "Generosity", "Wealth Capacity", "Ask Goal", "Current Donor", "Recent Major Donation",
    "Major Donation Amount", "Past Donor", "Five Years In Row", "Long-term Commitment",
    "Recent $1000 Donation", "Parent", "Grandparent", "Alumni", "Board Member",
    "Donor Fund Foundation", "Capacity Score", "Hunch", "Prospect Subtotal", "Total Score",
    "Moves Needed", "Moves Scheduled", "Moves Completed", "Fiscal Year Label", "Solicitor",
  ];

  const quickFilters = [
    { id: "generosity", label: "Generosity", icon: Funnel, options: GENEROSITY_OPTIONS, selected: selectedGenerosity, setter: setSelectedGenerosity },
    { id: "city", label: "City", icon: MapPin, options: cityOptions, selected: selectedCities, setter: setSelectedCities },
    { id: "capacity", label: "Capacity", icon: DollarSign, options: capacityOptions, selected: selectedCapacities, setter: setSelectedCapacities },
  ] as const;

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-stone-900">Donors</h1>
          <p className="mt-1 text-sm text-stone-500">
            <span className="font-semibold text-stone-900">{totalCount}</span> donors total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          <Plus className="w-4 h-4" />
          Add Donor
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          iconClassName="bg-amber-50 text-amber-600"
          value={formatNumber(totalCount)}
          label="Total Donors"
        />
        <StatCard
          icon={Zap}
          iconClassName="bg-red-50 text-red-500"
          value={formatNumber(stats.onFireCount)}
          label="On Fire!"
        />
        <StatCard
          icon={DollarSign}
          iconClassName="bg-blue-50 text-blue-500"
          value={formatCompactCurrency(stats.totalCapacity)}
          label="Total Capacity"
        />
        <StatCard
          icon={Activity}
          iconClassName="bg-violet-50 text-violet-500"
          value={formatNumber(stats.activeThisYear)}
          label="Active This Year"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-[420px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name, email, or city..."
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
          />
        </div>

        {quickFilters.map((filter) => (
          <div key={filter.id} className="relative">
          <button
            key={filter.id}
            type="button"
            onClick={() => setOpenFilter((current) => current === filter.id ? null : filter.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
              filter.selected.length > 0 || openFilter === filter.id
                ? "border-orange-500 bg-amber-50 text-orange-600"
                : "border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-800"
            )}
          >
            <filter.icon className="h-4 w-4" />
            {filter.label}
            {filter.selected.length > 0 ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">{filter.selected.length}</span> : null}
          </button>
          {openFilter === filter.id ? (
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-900">{filter.label}</p>
                {filter.selected.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => filter.setter([])}
                    className="text-xs font-medium text-orange-600 hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="max-h-64 space-y-1 overflow-auto">
                {filter.options.length > 0 ? (
                  filter.options.map((option) => {
                    const isSelected = filter.selected.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          filter.setter(
                            isSelected
                              ? filter.selected.filter((value) => value !== option)
                              : [...filter.selected, option]
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isSelected ? "bg-amber-50 text-orange-700" : "text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        <span className="truncate">{option}</span>
                        <span className={cn("ml-3 h-4 w-4 rounded border", isSelected ? "border-orange-500 bg-orange-500" : "border-stone-300")} />
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-stone-400">No options available</div>
                )}
              </div>
            </div>
          ) : null}
          </div>
        ))}

        <div className="ml-auto inline-flex overflow-hidden rounded-xl border border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center px-4 py-2.5 transition-colors",
              viewMode === "table" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
            )}
            title="Table"
          >
            <Rows3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center border-l border-stone-300 px-4 py-2.5 transition-colors",
              viewMode === "cards" ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-stone-50"
            )}
            title="Cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="dm-table-shell">
        <div className="dm-table-scroll h-full">
          <table className="dm-table" style={{ minWidth: widths.reduce((a, b) => a + b, 0) }}>
            <thead>
              <tr>
                {HEADER_LABELS.map((label, i) => (
                  <th
                    key={DONOR_COLUMNS[i].key}
                    className={cn(i === 0 ? thFirst : thBase, i === HEADER_LABELS.length - 1 && "dm-table-head-cell-last")}
                    style={{ width: widths[i], minWidth: DONOR_COLUMNS[i].minWidth }}
                  >
                    <div className="flex h-full items-center gap-1.5">{label}</div>
                    <div className={resizeHandle} onMouseDown={(e) => onMouseDown(i, e)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={31} className="dm-table-empty">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" />
                  </td>
                </tr>
              ) : donors.length === 0 ? (
                <tr>
                  <td colSpan={31} className="dm-table-empty">
                    {search ? "No donors match your search" : "No donors yet. Add your first donor!"}
                  </td>
                </tr>
              ) : (
                donors.map((donor) => {
                  const donorTheme = getGenerosityTableTheme(donor.generosity_score);

                  return (
                    <tr key={donor.id} className="dm-table-row">
                      <td className="dm-table-cell dm-table-cell-sticky overflow-hidden text-ellipsis" style={{ width: widths[0], maxWidth: widths[0] }}>
                        <Link href={`/dashboard/donors/${donor.id}`} className="flex items-center gap-3 text-stone-900 transition-colors hover:text-orange-600">
                          <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[11px] font-semibold tracking-[0.08em]", donorTheme.avatar)}>
                            {getInitials(formatNullableValue(donor.name))}
                          </span>
                          <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                            {formatNullableValue(donor.name)}
                          </span>
                        </Link>
                      </td>
                      <td className={cn(tdBase, "text-stone-500")} style={{ width: widths[1], maxWidth: widths[1] }}>{formatNullableValue(donor.first_name) || "—"}</td>
                      <td className={cn(tdBase, "text-stone-500")} style={{ width: widths[2], maxWidth: widths[2] }}>{formatNullableValue(donor.last_name) || "—"}</td>
                      <td className={tdBase} style={{ width: widths[3], maxWidth: widths[3] }}>
                        {donor.email ? (
                          <a href={`mailto:${donor.email}`} className="text-stone-500 transition-colors hover:text-orange-600">{donor.email}</a>
                        ) : "—"}
                      </td>
                      <td className={tdBase} style={{ width: widths[4], maxWidth: widths[4] }}>
                        {donor.mobile_phone ? (
                          <a href={`tel:${donor.mobile_phone}`} className="text-stone-500 transition-colors hover:text-orange-600">{donor.mobile_phone}</a>
                        ) : "—"}
                      </td>
                      <td className={cn(tdBase, "text-stone-700")} style={{ width: widths[5], maxWidth: widths[5] }}>{formatNullableValue(donor.city) || "—"}</td>
                      <td className={cn(tdBase, "text-stone-700")} style={{ width: widths[6], maxWidth: widths[6] }}>{formatNullableValue(donor.state) || "—"}</td>
                      <td className={cn(tdBase, "text-center")} style={{ width: widths[7], maxWidth: widths[7] }}>
                        {donor.generosity_score ? (
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", donorTheme.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", donorTheme.dot)} />
                            {donor.generosity_score}
                          </span>
                        ) : "—"}
                      </td>
                      <td className={tdBase} style={{ width: widths[8], maxWidth: widths[8] }}>
                        {donor.wealth_capacity ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-medium text-stone-800">{formatNullableValue(donor.wealth_capacity)}</span>
                            <div className="h-1 w-20 overflow-hidden rounded-full bg-stone-100">
                              <div className="h-full rounded-full bg-orange-500" style={{ width: `${getWealthCapacityProgress(donor.wealth_capacity)}%` }} />
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className={cn(tdBase, "text-right font-medium text-stone-900")} style={{ width: widths[9], maxWidth: widths[9] }}>{donor.ask_goal ? formatCurrency(donor.ask_goal) : "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[10], maxWidth: widths[10] }}>{formatNullableValue(donor.is_current_donor) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[11], maxWidth: widths[11] }}>{formatNullableValue(donor.recent_major_donation) || "—"}</td>
                      <td className={cn(tdBase, "text-right text-stone-500")} style={{ width: widths[12], maxWidth: widths[12] }}>{formatNullableValue(donor.major_donation_amount) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[13], maxWidth: widths[13] }}>{formatNullableValue(donor.is_past_donor) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[14], maxWidth: widths[14] }}>{formatNullableValue(donor.five_years_in_row) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[15], maxWidth: widths[15] }}>{formatNullableValue(donor.long_term_commitment) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[16], maxWidth: widths[16] }}>{formatNullableValue(donor.recent_1000_donation) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[17], maxWidth: widths[17] }}>{formatNullableValue(donor.is_parent) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[18], maxWidth: widths[18] }}>{formatNullableValue(donor.is_grandparent) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[19], maxWidth: widths[19] }}>{formatNullableValue(donor.is_alumni) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[20], maxWidth: widths[20] }}>{formatNullableValue(donor.is_board_member) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[21], maxWidth: widths[21] }}>{formatNullableValue(donor.donor_fund_foundation) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[22], maxWidth: widths[22] }}>{formatNullableValue(donor.capacity_score) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[23], maxWidth: widths[23] }}>{formatNullableValue(donor.hunch) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[24], maxWidth: widths[24] }}>{formatNullableValue(donor.prospect_subtotal) || "—"}</td>
                      <td className={cn(tdBase, "text-center")} style={{ width: widths[25], maxWidth: widths[25] }}>
                        <span className="font-semibold text-stone-900">{formatNullableValue(donor.total_score) || "—"}</span>
                      </td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[26], maxWidth: widths[26] }}>{formatNullableValue(donor.moves_needed) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[27], maxWidth: widths[27] }}>{formatNullableValue(donor.moves_scheduled) || "—"}</td>
                      <td className={cn(tdBase, "text-center text-stone-500")} style={{ width: widths[28], maxWidth: widths[28] }}>{formatNullableValue(donor.moves_completed) || "—"}</td>
                      <td className={cn(tdBase, "text-stone-500")} style={{ width: widths[29], maxWidth: widths[29] }}>{formatNullableValue(donor.fiscal_year_label) || "—"}</td>
                      <td className="dm-table-cell dm-table-cell-last overflow-hidden text-ellipsis text-stone-500" style={{ width: widths[30], maxWidth: widths[30] }}>
                        {formatNullableValue(donor.solicitor_name) || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="dm-table-footer">
          <span className="text-sm text-stone-500">
            Showing <strong className="font-semibold text-stone-900">{rangeStart}-{rangeEnd}</strong> of <strong className="font-semibold text-stone-900">{totalCount}</strong> donors
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="dm-page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="flex h-9 min-w-9 items-center justify-center text-sm text-stone-300">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={cn("dm-page-btn", item === page && "dm-page-btn-active")}
                  >
                    {item + 1}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="dm-page-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>
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

function getWealthCapacityProgress(value: string | null | undefined): number {
  if (!value) return 0;
  if (value.includes("$1M")) return 92;
  if (value.includes("$500K")) return 80;
  if (value.includes("$250K")) return 68;
  if (value.includes("$100K")) return 56;
  if (value.includes("$50K")) return 44;
  if (value.includes("$25K")) return 30;
  if (value.includes("$15K")) return 22;
  if (value.includes("$10K")) return 16;
  return 12;
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  if (currentPage <= 2) {
    return [0, 1, 2, 3, "ellipsis", totalPages - 1];
  }

  if (currentPage >= totalPages - 3) {
    return [0, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
  }

  return [0, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages - 1];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function StatCard({
  icon: Icon,
  iconClassName,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-300 bg-white px-5 py-4 shadow-sm">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconClassName)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-serif text-2xl font-medium leading-none text-stone-900">{value}</div>
        <div className="mt-1 text-sm text-stone-500">{label}</div>
      </div>
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
