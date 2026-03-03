import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getScoreColor(score: number | null | undefined): string {
  if (score == null) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function getGenerosityColor(score: string | null | undefined): string {
  switch (score) {
    case "On Fire!":
      return "bg-orange-100 text-orange-700";
    case "Hot":
      return "bg-red-100 text-red-700";
    case "Warm":
      return "bg-yellow-100 text-yellow-700";
    case "Cool":
      return "bg-blue-100 text-blue-700";
    case "Cold":
      return "bg-cyan-100 text-cyan-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function getGenerosityTableTheme(score: string | null | undefined): {
  badge: string;
  avatar: string;
  dot: string;
} {
  switch (score) {
    case "On Fire!":
      return {
        badge: "bg-red-50 text-red-600",
        avatar: "bg-red-50 text-red-600",
        dot: "bg-red-500",
      };
    case "Hot":
      return {
        badge: "bg-orange-50 text-orange-600",
        avatar: "bg-orange-50 text-orange-600",
        dot: "bg-orange-500",
      };
    case "Warm":
      return {
        badge: "bg-amber-50 text-amber-600",
        avatar: "bg-amber-50 text-amber-600",
        dot: "bg-amber-500",
      };
    case "Cool":
      return {
        badge: "bg-blue-50 text-blue-600",
        avatar: "bg-blue-50 text-blue-600",
        dot: "bg-blue-500",
      };
    case "Cold":
      return {
        badge: "bg-violet-50 text-violet-600",
        avatar: "bg-violet-50 text-violet-600",
        dot: "bg-violet-500",
      };
    default:
      return {
        badge: "bg-stone-100 text-stone-600",
        avatar: "bg-stone-100 text-stone-600",
        dot: "bg-stone-400",
      };
  }
}

export function getInitials(value: string | null | undefined): string {
  if (!value) return "DM";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
