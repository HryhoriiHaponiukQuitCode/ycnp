"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/org-context";
import { formatCurrency, getGenerosityColor, formatDate } from "@/lib/utils";
import {
  Users,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

interface DashboardStats {
  totalDonors: number;
  totalMoves: number;
  completedMoves: number;
  overdueMoves: number;
  totalAskGoal: number;
}

export default function DashboardPage() {
  const { organization, loading: orgLoading } = useOrganization();
  const [stats, setStats] = useState<DashboardStats>({
    totalDonors: 0,
    totalMoves: 0,
    completedMoves: 0,
    overdueMoves: 0,
    totalAskGoal: 0,
  });
  const [recentMoves, setRecentMoves] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!organization) return;

    async function loadDashboard() {
      setLoading(true);

      // Stats
      const [donorsRes, movesRes, completedRes, overdueRes] = await Promise.all([
        supabase.from("donors").select("id, ask_goal", { count: "exact" }).eq("organization_id", organization!.id),
        supabase.from("moves").select("id", { count: "exact" }).eq("organization_id", organization!.id),
        supabase.from("moves").select("id", { count: "exact" }).eq("organization_id", organization!.id).eq("is_completed", true),
        supabase.from("moves").select("id", { count: "exact" }).eq("organization_id", organization!.id).eq("is_completed", false).lt("due_date", new Date().toISOString().split("T")[0]),
      ]);

      const totalAskGoal = donorsRes.data?.reduce((sum, d) => sum + (d.ask_goal || 0), 0) || 0;

      setStats({
        totalDonors: donorsRes.count || 0,
        totalMoves: movesRes.count || 0,
        completedMoves: completedRes.count || 0,
        overdueMoves: overdueRes.count || 0,
        totalAskGoal,
      });

      // Recent moves
      const { data: moves } = await supabase
        .from("moves")
        .select("*, donors(name, generosity_score)")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false })
        .limit(8);

      setRecentMoves(moves || []);

      // Top donors by score
      const { data: donors } = await supabase
        .from("v_donor_summary")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("total_score", { ascending: false })
        .limit(10);

      setTopDonors(donors || []);
      setLoading(false);
    }

    loadDashboard();
  }, [organization]);

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-stone-600">No Organization</h2>
        <p className="text-stone-400 mt-2">Create or join an organization to get started.</p>
      </div>
    );
  }

  const completionRate = stats.totalMoves > 0 ? Math.round((stats.completedMoves / stats.totalMoves) * 100) : 0;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-600 text-sm mt-0.5">{organization.name} — Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Donors" value={stats.totalDonors.toString()} color="blue" />
        <StatCard icon={ArrowRightLeft} label="Total Moves" value={stats.totalMoves.toString()} color="purple" />
        <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} color="green" />
        <StatCard icon={AlertTriangle} label="Overdue Moves" value={stats.overdueMoves.toString()} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Moves */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <h3 className="font-semibold text-stone-900">Recent Moves</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {recentMoves.length === 0 ? (
              <div className="px-5 py-8 text-center text-stone-500 text-sm">No moves yet</div>
            ) : (
              recentMoves.map((move) => (
                <div key={move.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{move.name}</p>
                    <p className="text-xs text-stone-600">{move.donors?.name}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        move.is_completed
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {move.is_completed ? "Completed" : "Pending"}
                    </span>
                    {move.due_date && (
                      <p className="text-xs text-stone-500 mt-0.5">{formatDate(move.due_date)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Donors */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-stone-500" />
            <h3 className="font-semibold text-stone-900">Top Donors by Score</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {topDonors.length === 0 ? (
              <div className="px-5 py-8 text-center text-stone-500 text-sm">No donors yet</div>
            ) : (
              topDonors.map((donor) => (
                <div key={donor.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{donor.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {donor.generosity_score && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getGenerosityColor(donor.generosity_score)}`}>
                          {donor.generosity_score}
                        </span>
                      )}
                      <span className="text-xs text-stone-500">
                        {donor.solicitor_name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-900">{donor.total_score || 0}</p>
                    <p className="text-xs text-stone-500">
                      {formatCurrency(donor.ask_goal)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "blue" | "green" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-stone-600 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-stone-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
