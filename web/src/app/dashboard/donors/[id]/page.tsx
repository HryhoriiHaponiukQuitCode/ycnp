"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatCurrency, formatDate, getGenerosityColor, getScoreColor, cn } from "@/lib/utils";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Activity,
  BrainCircuit,
  Pencil,
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";

// Define tabs
type Tab = "overview" | "scores" | "moves" | "donations" | "notes";

export default function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [donor, setDonor] = useState<any>(null);
  const [scores, setScores] = useState<any>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Form state for editing
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!organization || !id) return;

    async function loadDonorData() {
      setLoading(true);

      // Fetch donor details
      const { data: donorData, error } = await supabase
        .from("v_donor_summary")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization!.id)
        .single();

      if (error || !donorData) {
        console.error("Error loading donor:", error);
        // Handle not found
        return;
      }
      setDonor(donorData);
      setFormData(donorData);

      // Fetch scores for current fiscal year (if available)
      const { data: scoresData } = await supabase
        .from("donor_scores")
        .select("*")
        .eq("donor_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (scoresData) setScores(scoresData);

      // Fetch moves
      const { data: movesData } = await supabase
        .from("v_moves_dashboard")
        .select("*")
        .eq("donor_id", id)
        .order("due_date", { ascending: false });

      if (movesData) setMoves(movesData);

      // Fetch donations
      const { data: donationsData } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", id)
        .order("donated_at", { ascending: false });

      if (donationsData) setDonations(donationsData);

      // Fetch notes
      const { data: notesData } = await supabase
        .from("meeting_notes")
        .select("*")
        .eq("donor_id", id)
        .order("meeting_date", { ascending: false });
        
      if (notesData) setNotes(notesData);

      setLoading(false);
    }

    loadDonorData();
  }, [id, organization]);

  // Handle updates
  async function handleSave() {
    setSaving(true);
    // Update donor table
    // Note: v_donor_summary is a view, we need to update 'donors' table
    const updateData = {
      name: formData.name,
      email: formData.email,
      mobile_phone: formData.mobile_phone,
      city: formData.city,
      state: formData.state,
      ask_goal: formData.ask_goal,
      // Add other editable fields mapping here if needed
    };

    const { error } = await supabase
      .from("donors")
      .update(updateData)
      .eq("id", id);
    
    if (!error) {
      setDonor({ ...donor, ...updateData });
      setIsEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
     return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      );
  }

  if (!donor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-stone-700">Donor not found</h2>
        <Link href="/dashboard/donors" className="text-orange-600 hover:underline mt-4 inline-block">
          Return to Donors List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <Link href="/dashboard/donors" className="hover:text-stone-800 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Donors
            </Link>
            <span>/</span>
            <span>{donor.name}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="text-3xl font-bold text-stone-900 border-b border-stone-300 focus:outline-none focus:border-orange-500 bg-transparent px-1 min-w-[300px]"
              />
            ) : (
               <h1 className="text-3xl font-bold text-stone-900">{donor.name}</h1>
            )}
            {donor.generosity_score && (
               <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getGenerosityColor(donor.generosity_score)}`}>
                 {donor.generosity_score}
               </span>
             )}
          </div>
          
          <div className="flex items-center gap-6 text-sm text-stone-500 mt-2">
             <div className="flex items-center gap-1.5">
               <MapPin className="w-4 h-4" />
               {isEditing ? (
                  <div className="flex gap-1">
                    <input 
                      value={formData.city || ''} 
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      placeholder="City"
                      className="border rounded px-1 w-24"
                    />,
                    <input 
                      value={formData.state || ''} 
                      onChange={e => setFormData({...formData, state: e.target.value})}
                      placeholder="State"
                      className="border rounded px-1 w-12"
                    />
                  </div>
               ) : (
                 <span>{[donor.city, donor.state].filter(Boolean).join(", ") || "No location"}</span>
               )}
             </div>
             <div className="flex items-center gap-1.5">
               <User className="w-4 h-4" />
               <span>Solicitor: <span className="text-stone-700 font-medium">{donor.solicitor_name || "Unassigned"}</span></span>
             </div>
          </div>
        </div>

        <div className="flex gap-2">
           {isEditing ? (
             <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin"/>}
                  Save Changes
                </button>
             </>
           ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
           )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
           <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Total Score</p>
           <p className={`text-2xl font-bold mt-1 ${getScoreColor(donor.total_score)}`}>{donor.total_score || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
           <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Ask Goal</p>
           {isEditing ? (
             <input 
               type="number"
               value={formData.ask_goal || 0}
               onChange={e => setFormData({...formData, ask_goal: Number(e.target.value)})}
               className="text-2xl font-bold mt-1 w-full border-b border-stone-200 focus:outline-none focus:border-orange-500"
             />
           ) : (
              <p className="text-2xl font-bold text-stone-800 mt-1">{formatCurrency(donor.ask_goal)}</p>
           )}
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
           <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Moves</p>
           <div className="flex items-baseline gap-1 mt-1">
             <span className="text-2xl font-bold text-stone-800">{donor.moves_completed || 0}</span>
             <span className="text-stone-400">/ {donor.moves_scheduled || 0}</span>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
           <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Last Contact</p>
           <p className="text-lg font-medium text-stone-800 mt-1">
             {moves.length > 0 && moves[0].completed_at ? formatDate(moves[0].completed_at) : "—"}
           </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex gap-6">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "scores", label: "Scores", icon: TrendingUp },
            { id: "moves", label: "Moves", icon: Activity },
            { id: "donations", label: "Donations", icon: DollarSign },
            { id: "notes", label: "Notes", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-xl border border-stone-200">
                <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500" /> Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-500">Email</label>
                    {isEditing ? (
                       <input 
                         type="email" 
                         value={formData.email || ''} 
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         className="block w-full text-sm font-medium border rounded px-2 py-1 mt-1"
                       />
                    ) : (
                      <div className="text-sm font-medium text-stone-800 flex items-center justify-between">
                         {donor.email || "—"}
                         {donor.email && <a href={`mailto:${donor.email}`} className="text-orange-600 text-xs hover:underline">Send Email</a>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Mobile Phone</label>
                    {isEditing ? (
                       <input 
                         type="tel" 
                         value={formData.mobile_phone || ''} 
                         onChange={e => setFormData({...formData, mobile_phone: e.target.value})}
                         className="block w-full text-sm font-medium border rounded px-2 py-1 mt-1"
                       />
                    ) : (
                      <div className="text-sm font-medium text-stone-800 flex items-center justify-between">
                        {donor.mobile_phone || "—"}
                        {donor.mobile_phone && <a href={`tel:${donor.mobile_phone}`} className="text-orange-600 text-xs hover:underline">Call</a>}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "scores" && (
           <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
             {!scores ? (
                <div className="p-8 text-center text-stone-500">No score data for this year.</div>
             ) : (
                <div className="p-6">
                   <h3 className="font-semibold text-lg mb-4">Fiscal Year Assessment</h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <ScoreItem label="Is Current Donor" value={scores.is_current_donor} score={10} />
                      <ScoreItem label="Is Past Donor" value={scores.is_past_donor} score={5} />
                      <ScoreItem label="Long Term Commitment" value={scores.long_term_commitment} score={5} />
                      <ScoreItem label="Recent Major Donation" value={scores.recent_major_donation} score={5} />
                      <ScoreItem label="Recent $1000+ Donation" value={scores.recent_1000_donation} score={5} />
                      <ScoreItem label="Is Board Member" value={scores.is_board_member} score={10} />
                      <ScoreItem label="Capacity Score" value={scores.capacity_score} score={scores.capacity_score} />
                      <ScoreItem label="Hunch Score" value={scores.hunch} score={scores.hunch} />
                   </div>
                </div>
             )}
           </div>
        )}

        {activeTab === "moves" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="font-semibold text-stone-800">Moves History</h3>
               <button className="text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700">Add Move</button>
            </div>
            {moves.length === 0 ? (
               <div className="p-8 bg-stone-50 rounded-xl text-center text-stone-500 border border-stone-200 border-dashed">
                 No moves recorded yet.
               </div>
            ) : (
               <div className="dm-table-shell">
                 <div className="dm-table-scroll">
                 <table className="dm-table">
                    <thead>
                      <tr>
                        <th className="dm-table-head-cell">Move</th>
                        <th className="dm-table-head-cell">Status</th>
                        <th className="dm-table-head-cell">Due / Completed</th>
                        <th className="dm-table-head-cell dm-table-head-cell-last">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moves.map(move => (
                        <tr key={move.id} className="dm-table-row">
                          <td className="dm-table-cell font-medium text-stone-800">{move.move_name}</td>
                          <td className="dm-table-cell">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${move.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {move.is_completed ? 'Completed' : 'Pending'}
                            </span>
                          </td>
                          <td className="dm-table-cell text-stone-500">
                            {move.is_completed ? formatDate(move.completed_at) : formatDate(move.due_date)}
                          </td>
                          <td className="dm-table-cell dm-table-cell-last text-stone-500">
                            {move.assigned_to_name || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 </div>
               </div>
            )}
          </div>
        )}
        
        {activeTab === "donations" && (
           <div className="dm-table-shell">
             {donations.length === 0 ? (
                <div className="p-8 text-center text-stone-500">No donations recorded.</div>
             ) : (
                <div className="dm-table-scroll">
                <table className="dm-table">
                   <thead>
                     <tr>
                       <th className="dm-table-head-cell w-32">Date</th>
                       <th className="dm-table-head-cell w-32 text-right">Amount</th>
                       <th className="dm-table-head-cell">Type</th>
                       <th className="dm-table-head-cell dm-table-head-cell-last">Description</th>
                     </tr>
                   </thead>
                   <tbody>
                      {donations.map(donation => (
                        <tr key={donation.id} className="dm-table-row">
                          <td className="dm-table-cell text-stone-500">{formatDate(donation.donated_at)}</td>
                          <td className="dm-table-cell text-right font-medium text-stone-800">{formatCurrency(donation.amount)}</td>
                          <td className="dm-table-cell">
                             <span className="capitalize px-2 py-0.5 bg-stone-100 rounded text-xs text-stone-600">{donation.donation_type}</span>
                          </td>
                          <td className="dm-table-cell dm-table-cell-last text-stone-500">{donation.description || '—'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
                </div>
             )}
           </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
             {notes.map(note => (
               <div key={note.id} className="bg-white p-4 rounded-xl border border-stone-200">
                 <div className="flex justify-between mb-2">
                   <h4 className="font-semibold text-stone-800">Meeting Info</h4>
                   <span className="text-xs text-stone-400">{formatDate(note.meeting_date)}</span>
                 </div>
                 {note.raw_notes && <p className="text-sm text-stone-600 whitespace-pre-line">{note.raw_notes}</p>}
                 {/* Render key outcomes if they exist */}
                 {note.key_outcomes && note.key_outcomes.length > 0 && (
                   <div className="mt-3">
                     <p className="text-xs font-semibold text-stone-700 mb-1">Key Outcomes</p>
                     <ul className="list-disc list-inside text-sm text-stone-600">
                       {note.key_outcomes.map((outcome: string, i: number) => (
                         <li key={i}>{outcome}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             ))}
             {notes.length === 0 && (
                <div className="p-8 text-center text-stone-500 bg-stone-50 border border-stone-200 border-dashed rounded-xl">
                  No meeting notes yet.
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreItem({ label, value, score }: { label: string; value: any; score: number }) {
  const isYes = value === 1 || value === true || (typeof value === 'number' && value > 0);
  // If value is a specific number (like capacity score), display that, otherwise show checkmark/points
  const displayValue = typeof value === 'number' && score !== 5 && score !== 10 ? value : (isYes ? `Yes (+${score})` : "No");

  return (
    <div className="flex flex-col p-3 bg-stone-50 rounded-lg border border-stone-100">
      <span className="text-xs text-stone-500">{label}</span>
      <span className={`font-semibold mt-1 ${isYes ? 'text-green-700' : 'text-stone-400'}`}>
        {displayValue}
      </span>
    </div>
  );
}
