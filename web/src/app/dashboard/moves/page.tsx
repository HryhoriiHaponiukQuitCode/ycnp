"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatDate, cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Filter,
  LayoutList,
  Plus,
  Search,
  User,
  MoreHorizontal,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

type MoveView = "pending" | "completed" | "all";
type DisplayMode = "list" | "calendar";

export default function MovesPage() {
  const { organization } = useOrganization();
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<MoveView>("pending");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const supabase = createClient();

  const loadMoves = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    let query = supabase
      .from("v_moves_dashboard")
      .select("*")
      .eq("organization_id", organization.id)
      .order("due_date", { ascending: view !== "completed" }); // Sort by due date asc for pending, desc for completed maybe?

    if (view === "pending") {
      query = query.eq("is_completed", false);
    } else if (view === "completed") {
      query = query.eq("is_completed", true).order("completed_at", { ascending: false });
    }

    if (search) {
      query = query.or(`move_name.ilike.%${search}%,donor_name.ilike.%${search}%`);
    }

    const { data } = await query;
    setMoves(data || []);
    setLoading(false);
  }, [organization, view, search]);

  useEffect(() => {
    loadMoves();
  }, [loadMoves]);

  async function toggleStatus(id: string, currentStatus: boolean) {
    // Optimistic update
    setMoves(moves.map(m => m.id === id ? { ...m, is_completed: !currentStatus } : m));

    // Update DB
    // We need to update the 'moves' table, not the view
    const { error } = await supabase
      .from("moves")
      .update({
        is_completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (error) {
       // Revert on error
       console.error("Error updating move:", error);
       loadMoves();
    }
  }

  // Calendar helpers
  function getCalendarDays(month: Date) {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);

    // Monday = 0, Sunday = 6
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: Date[] = [];

    // Padding before first day
    for (let i = 0; i < startDow; i++) {
      days.push(new Date(year, m, -startDow + i + 1));
    }

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, m, d));
    }

    // Padding after last day to fill last row
    while (days.length % 7 !== 0) {
      days.push(new Date(year, m + 1, days.length - lastDay.getDate() - startDow + 1));
    }

    return days;
  }

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isToday(d: Date) {
    return isSameDay(d, new Date());
  }

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const movesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const move of moves) {
      if (!move.due_date) continue;
      const key = move.due_date.split("T")[0]; // yyyy-mm-dd
      if (!map[key]) map[key] = [];
      map[key].push(move);
    }
    return map;
  }, [moves]);

  function navigateMonth(dir: -1 | 1) {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  }

  function goToToday() {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Moves & Tasks</h1>
          <p className="text-stone-500 text-sm">Manage donor relationships and touchpoints</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Move
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Filters Bar */}
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-4 bg-stone-50/50">
          <div className="flex items-center gap-3">
            {/* Display mode toggle */}
            <div className="flex bg-stone-200/50 p-1 rounded-lg">
              <button
                onClick={() => setDisplayMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  displayMode === "list" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
                title="List view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDisplayMode("calendar")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  displayMode === "calendar" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
                title="Calendar view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Status filter */}
            <div className="flex bg-stone-200/50 p-1 rounded-lg">
             <button
               onClick={() => setView("pending")}
               className={cn(
                 "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                 view === "pending" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
               )}
             >
               Pending
             </button>
             <button
               onClick={() => setView("completed")}
               className={cn(
                 "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                 view === "completed" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
               )}
             >
               Completed
             </button>
             <button
               onClick={() => setView("all")}
               className={cn(
                 "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                 view === "all" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
               )}
             >
               All
             </button>
            </div>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search moves..."
              className="w-full pl-9 pr-4 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : displayMode === "calendar" ? (
            /* ── Calendar View ── */
            <div className="p-4">
              {/* Month header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-stone-800 ml-2">{monthLabel}</h2>
                </div>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm font-medium border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-700 transition-colors"
                >
                  Today
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 border-t border-l border-stone-200">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="px-2 py-2 text-xs font-semibold text-stone-500 text-center border-r border-b border-stone-200 bg-stone-50">
                    {day}
                  </div>
                ))}

                {/* Day cells */}
                {calendarDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                  const dayMoves = movesByDate[key] || [];
                  const maxVisible = 3;
                  const overflow = dayMoves.length - maxVisible;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative min-h-[110px] border-r border-b border-stone-200 p-1.5 transition-colors",
                        isCurrentMonth ? "bg-white" : "bg-stone-50/60",
                        isToday(day) && "bg-orange-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1",
                          isToday(day)
                            ? "bg-orange-600 text-white"
                            : isCurrentMonth
                            ? "text-stone-700"
                            : "text-stone-400"
                        )}
                      >
                        {day.getDate()}
                      </span>

                      <div className="space-y-0.5">
                        {dayMoves.slice(0, maxVisible).map((move: any) => {
                          const overdue = !move.is_completed && move.due_date && new Date(move.due_date) < new Date();
                          return (
                            <button
                              key={move.id}
                              onClick={() => toggleStatus(move.id, move.is_completed || false)}
                              className={cn(
                                "w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate block transition-colors",
                                move.is_completed
                                  ? "bg-green-100 text-green-800 line-through"
                                  : overdue
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              )}
                              title={`${move.move_name} – ${move.donor_name}${move.assigned_to_name ? ` (${move.assigned_to_name})` : ""}`}
                            >
                              {move.move_name}
                            </button>
                          );
                        })}
                        {overflow > 0 && (
                          <div className="text-[10px] text-stone-500 pl-1.5 font-medium">
                            +{overflow} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : moves.length === 0 ? (
            /* ── Empty state (list) ── */
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
               <Calendar className="w-12 h-12 mb-3 text-stone-200" />
               <p>No {view} moves found</p>
            </div>
          ) : (
            /* ── List View ── */
            <div className="divide-y divide-stone-100">
              {moves.map((move) => {
                const isOverdue = !move.is_completed && move.due_date && new Date(move.due_date) < new Date();
                
                return (
                  <div key={move.id} className="group flex items-start p-4 hover:bg-stone-50/50 transition-colors gap-4">
                    <button 
                      onClick={() => toggleStatus(move.id, move.is_completed || false)}
                      className={cn(
                         "mt-1 flex-shrink-0 transition-colors",
                         move.is_completed ? "text-green-600" : isOverdue ? "text-red-500 hover:text-red-600" : "text-stone-300 hover:text-stone-400"
                      )}
                    >
                      {move.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                         <div>
                            <h3 className={cn("font-medium text-stone-800 truncate pr-4", move.is_completed && "line-through text-stone-500")}>
                               {move.move_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm">
                               <Link href={`/dashboard/donors/${move.donor_id}`} className="text-orange-600 hover:underline font-medium">
                                 {move.donor_name}
                               </Link>
                               {move.donor_phone && (
                                  <>
                                    <span className="text-stone-300">•</span>
                                    <span className="text-stone-500">{move.donor_phone}</span>
                                  </>
                               )}
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                            {move.assigned_to_name && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-600">
                                  <User className="w-3 h-3" />
                                  {move.assigned_to_name}
                               </div>
                            )}
                            {move.due_date && (
                               <div className={cn("flex items-center gap-1.5 text-xs", isOverdue ? "text-red-600 font-medium" : "text-stone-400")}>
                                  <Clock className="w-3 h-3" />
                                  {formatDate(move.due_date)}
                               </div>
                            )}
                         </div>
                      </div>
                      
                      {move.notes && (
                        <p className="mt-2 text-sm text-stone-500 line-clamp-2">{move.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddMoveModal
          organizationId={organization?.id || ""}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadMoves();
          }}
        />
      )}
    </div>
  );
}

function AddMoveModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [donors, setDonors] = useState<any[]>([]);
  const [solicitors, setSolicitors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    donor_id: "",
    assigned_to: "",
    due_date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const supabase = createClient();

  useEffect(() => {
    // Determine fiscal year if needed, but for now just load solicitors
    async function loadResources() {
      const { data: solData } = await supabase
        .from("solicitors") // Should use v_solicitor_summary or solicitors table
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      
      if (solData) setSolicitors(solData);
    }
    loadResources();
  }, [organizationId]);

  // Search donors
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length < 2) return;
      
      const { data } = await supabase
        .from("donors")
        .select("id, name")
        .eq("organization_id", organizationId)
        .ilike("name", `%${searchTerm}%`)
        .limit(5);
        
      if (data) setDonors(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, organizationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    if (!formData.donor_id) {
       alert("Please select a donor");
       setSaving(false);
       return;
    }

    const { error } = await supabase.from("moves").insert({
      ...formData,
      organization_id: organizationId,
    });

    if (!error) {
      onCreated();
    } else {
       console.error(error);
       alert("Error creating move");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <h2 className="text-lg font-semibold text-stone-800">New Move</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Donor *</label>
            <div className="relative">
              <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (formData.donor_id) setFormData({...formData, donor_id: ""}); // Clear selection if typing
                 }}
                 placeholder="Search donor name..."
                 className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                    formData.donor_id ? "border-green-500 bg-green-50" : "border-stone-300"
                 )}
              />
              {searchTerm.length >= 2 && !formData.donor_id && donors.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                   {donors.map(d => (
                     <button
                       key={d.id}
                       type="button"
                       onClick={() => {
                          setFormData({...formData, donor_id: d.id});
                          setSearchTerm(d.name);
                          setDonors([]);
                       }}
                       className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                     >
                        {d.name}
                     </button>
                   ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Move Description *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Initial meeting, Follow-up call"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-stone-600 mb-1">Due Date</label>
               <input
                 type="date"
                 value={formData.due_date}
                 onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-stone-600 mb-1">Assign To</label>
               <select
                 value={formData.assigned_to}
                 onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
               >
                 <option value="">Unassigned</option>
                 {solicitors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                 ))}
               </select>
             </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
             <textarea
               rows={3}
               value={formData.notes}
               onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
               className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
             />
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
              Create Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
