import { clsx } from "clsx";

export function computeStatus(decision) {
  if (decision.outcome && decision.outcome.reviewed_at) return "reviewed";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const review = decision.review_date ? new Date(decision.review_date + "T00:00:00") : null;
  if (review && review <= today) return "ready_for_review";
  return "active";
}

export const STATUS_META = {
  active: { label: "Active", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ready_for_review: { label: "Ready for review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  reviewed: { label: "Reviewed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const RESULT_META = {
  better: { label: "Better than expected", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  as_expected: { label: "As expected", className: "bg-sky-50 text-sky-700 border-sky-200" },
  worse: { label: "Worse than expected", className: "bg-rose-50 text-rose-700 border-rose-200" },
  mixed: { label: "Mixed", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

export const ASSUMPTION_META = {
  correct: { label: "Correct", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partially_correct: { label: "Partially correct", className: "bg-amber-50 text-amber-700 border-amber-200" },
  incorrect: { label: "Incorrect", className: "bg-rose-50 text-rose-700 border-rose-200" },
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const DEFAULT_CATEGORIES = ["Product", "Engineering", "Hiring", "Marketing", "Finance", "Operations", "Strategy", "Personal"];

export function formatDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length > 10 ? d : d + "T00:00:00") : d;
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length > 10 ? d : d + "T00:00:00") : d;
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function parseMetricValue(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function pctDiff(expected, actual) {
  const e = parseMetricValue(expected);
  const a = parseMetricValue(actual);
  if (e === null || a === null || e === 0) return null;
  return ((a - e) / Math.abs(e)) * 100;
}

export function cx(...args) {
  return clsx(args);
}