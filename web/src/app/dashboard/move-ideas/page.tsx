"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { cn } from "@/lib/utils";
import { useResizableColumns, type ColumnDef } from "@/hooks/use-resizable-columns";
import {
  Lightbulb,
  Search,
  Plus,
  Loader2,
  Trash2,
  Globe,
  X,
} from "lucide-react";

const IDEA_COLUMNS: ColumnDef[] = [
  { key: "name", initialWidth: 220, minWidth: 120 },
  { key: "types", initialWidth: 200, minWidth: 100 },
  { key: "purpose", initialWidth: 180, minWidth: 100 },
  { key: "methods", initialWidth: 200, minWidth: 100 },
  { key: "notes", initialWidth: 280, minWidth: 120 },
  { key: "actions", initialWidth: 100, minWidth: 70 },
];

const IDEA_HEADERS = ["Name", "Types", "Purpose", "Methods", "Notes", "Actions"];

export default function MoveIdeasPage() {
  const { organization } = useOrganization();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  const loadIdeas = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    const { data } = await supabase
      .from("move_ideas")
      .select("*")
      .or(`organization_id.eq.${organization.id},is_global.eq.true`)
      .order("name");

    let filtered = data || [];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.types?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    setIdeas(filtered);
    setLoading(false);
  }, [organization, search]);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this idea?")) return;

    const { error } = await supabase
      .from("move_ideas")
      .delete()
      .eq("id", id)
      .eq("organization_id", organization!.id);

    if (!error) {
      loadIdeas();
    } else {
      alert("Error deleting idea. You may not have permission.");
    }
  };

  const formatArray = (arr: string[] | null | undefined) =>
    arr && arr.length > 0 ? arr.join(", ") : "";

  const { widths, onMouseDown } = useResizableColumns(IDEA_COLUMNS);
  const thBase = "dm-table-head-cell sticky top-0 z-20 relative select-none";
  const thFirst = "dm-table-head-cell dm-table-head-cell-sticky sticky top-0 z-30 relative select-none";
  const resizeHandle = "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400/60 active:bg-orange-500/80 z-40";
  const tdBase = "dm-table-cell overflow-hidden text-ellipsis";

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Move Ideas</h1>
          <p className="text-stone-500 text-sm">
            {ideas.length} idea{ideas.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Idea
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas by name, type, or notes..."
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="dm-table-shell">
        <div className="dm-table-scroll h-full">
          <table className="dm-table" style={{ minWidth: widths.reduce((a, b) => a + b, 0) }}>
            <thead className="sticky top-0 z-20">
              <tr>
                {IDEA_HEADERS.map((label, i) => (
                  <th
                    key={IDEA_COLUMNS[i].key}
                    className={cn(i === 0 ? thFirst : thBase, i === IDEA_HEADERS.length - 1 && "dm-table-head-cell-last")}
                    style={{ width: widths[i], minWidth: IDEA_COLUMNS[i].minWidth }}
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
                  <td colSpan={6} className="dm-table-empty">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                  </td>
                </tr>
              ) : ideas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dm-table-empty">
                    {search ? "No ideas match your search" : "No move ideas yet. Add your first idea!"}
                  </td>
                </tr>
              ) : (
                ideas.map((idea) => (
                  <tr key={idea.id} className="dm-table-row group">
                    <td className="dm-table-cell dm-table-cell-sticky overflow-hidden text-ellipsis" style={{ width: widths[0], maxWidth: widths[0] }}>
                      <div className="flex items-center gap-2">
                        <span className={cn("p-1 rounded", idea.is_global ? "text-purple-600" : "text-orange-600")}>
                          {idea.is_global ? <Globe className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                        </span>
                        <span className="font-medium text-stone-800">{idea.name}</span>
                      </div>
                    </td>
                    <td className={cn("px-4 py-3", tdBase)} style={{ width: widths[1], maxWidth: widths[1] }}>
                      {idea.types && idea.types.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {idea.types.map((t: string) => (
                            <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] uppercase font-semibold rounded tracking-wide">{t}</span>
                          ))}
                        </div>
                      ) : ""}
                    </td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[2], maxWidth: widths[2] }}>{formatArray(idea.purpose)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase)} style={{ width: widths[3], maxWidth: widths[3] }}>{formatArray(idea.methods)}</td>
                    <td className={cn("px-4 py-3 text-stone-600", tdBase, "truncate")} style={{ width: widths[4], maxWidth: widths[4] }}>{idea.notes || ""}</td>
                    <td className="dm-table-cell dm-table-cell-last text-center" style={{ width: widths[5], maxWidth: widths[5] }}>
                      {!idea.is_global && (
                        <button onClick={() => handleDelete(idea.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1" title="Delete idea">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddIdeaModal
          organizationId={organization?.id || ""}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadIdeas();
          }}
        />
      )}
    </div>
  );
}

function AddIdeaModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const [data, setData] = useState<any>({
    name: "",
    notes: "",
    types: [],
    purpose: [],
    methods: [],
    is_global: false
  });

  const availableTypes = ["Cultivation", "Solicitation", "Stewardship"];
  const availableMethods = ["In Person", "Phone", "Email", "Text", "Mail", "Event"];
  const availablePurposes = ["Qualification", "Education", "Connection", "Ask"];

  const toggleItem = (field: string, item: string) => {
    const current = data[field] || [];
    if (current.includes(item)) {
       setData({ ...data, [field]: current.filter((i: string) => i !== item) });
    } else {
       setData({ ...data, [field]: [...current, item] });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from("move_ideas").insert({
      ...data,
      organization_id: organizationId,
    });

    if (!error) {
      onCreated();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50 sticky top-0 z-10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-stone-800">New Move Idea</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Idea Name</label>
            <input
              type="text"
              required
              value={data.name}
              onChange={e => setData({...data, name: e.target.value})}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Coffee Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description / Notes</label>
            <textarea
              rows={3}
              value={data.notes}
              onChange={e => setData({...data, notes: e.target.value})}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Explain the purpose/outcome..."
            />
          </div>

          <div>
             <label className="block text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">Type</label>
             <div className="flex flex-wrap gap-2">
               {availableTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleItem('types', t)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                      data.types.includes(t) 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-white text-stone-600 border-stone-200 hover:border-blue-300 transform hover:-translate-y-0.5"
                    )}
                  >
                    {t}
                  </button>
               ))}
             </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">Method</label>
             <div className="flex flex-wrap gap-2">
               {availableMethods.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleItem('methods', m)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                      data.methods.includes(m) 
                        ? "bg-green-600 text-white border-green-600" 
                        : "bg-white text-stone-600 border-stone-200 hover:border-green-300 transform hover:-translate-y-0.5"
                    )}
                  >
                    {m}
                  </button>
               ))}
             </div>
          </div>

           <div>
             <label className="block text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">Purpose</label>
             <div className="flex flex-wrap gap-2">
               {availablePurposes.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleItem('purpose', p)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                      data.purpose.includes(p) 
                        ? "bg-purple-600 text-white border-purple-600" 
                        : "bg-white text-stone-600 border-stone-200 hover:border-purple-300 transform hover:-translate-y-0.5"
                    )}
                  >
                    {p}
                  </button>
               ))}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-100">
             <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg">
                Cancel
             </button>
             <button
               type="submit"
               disabled={saving}
               className="px-5 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
             >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Idea
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
