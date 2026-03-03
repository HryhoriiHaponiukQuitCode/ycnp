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

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
