"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { YCLogo } from "@/components/yc-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <YCLogo className="w-8 h-8" alt="YC" />
            <h1 className="text-3xl font-bold text-stone-900">DonorMind</h1>
          </div>
          <p className="text-stone-600 text-sm">Donor Relationship Intelligence</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center text-stone-900">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>

          <p className="text-center text-sm text-stone-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-medium font-semibold">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
