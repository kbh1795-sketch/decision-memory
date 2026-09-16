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
  active: { label: "진행 중", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ready_for_review: { label: "검토 대기", className: "bg-amber-50 text-amber-700 border-amber-200" },
  reviewed: { label: "검토 완료", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const RESULT_META = {
  better: { label: "예상보다 좋음", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  as_expected: { label: "예상과 일치", className: "bg-sky-50 text-sky-700 border-sky-200" },
  worse: { label: "예상보다 나쁨", className: "bg-rose-50 text-rose-700 border-rose-200" },
  mixed: { label: "혼합", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

export const ASSUMPTION_META = {
  correct: { label: "맞음", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partially_correct: { label: "부분적으로 맞음", className: "bg-amber-50 text-amber-700 border-amber-200" },
  incorrect: { label: "틀림", className: "bg-rose-50 text-rose-700 border-rose-200" },
  unknown: { label: "미정", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const DEFAULT_CATEGORIES = ["제품", "엔지니어링", "채용", "마케팅", "재무", "운영", "전략", "개인"];

export function formatDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length > 10 ? d : d + "T00:00:00") : d;
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("ko-KR", { day: "numeric", month: "long", year: "numeric" });
}

export function shortDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length > 10 ? d : d + "T00:00:00") : d;
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("ko-KR", { day: "numeric", month: "long" });
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