import { shortDate } from "@/lib/decisions";
import { CheckCircle2, ClipboardList, Sparkles, CalendarClock } from "lucide-react";

export default function Timeline({ decision }) {
  const events = [];
  if (decision.decision_date) {
    events.push({
      date: decision.decision_date,
      icon: ClipboardList,
      tone: "slate",
      title: "Decision made",
      body: decision.title,
      detail: decision.confidence != null ? `Confidence ${decision.confidence}%` : null,
    });
  }
  if (decision.expected_metrics && decision.expected_metrics.length) {
    events.push({
      date: decision.decision_date,
      icon: CalendarClock,
      tone: "slate",
      title: "Expectation recorded",
      body: decision.expected_metrics.map((m) => `${m.metric_name}: ${m.expected_value}${m.unit ? " " + m.unit : ""}`).join("  ·  "),
    });
  }
  if (decision.review_date) {
    events.push({
      date: decision.review_date,
      icon: CalendarClock,
      tone: "amber",
      title: "Review date reached",
      body: null,
    });
  }
  if (decision.outcome && decision.outcome.reviewed_at) {
    events.push({
      date: decision.outcome.reviewed_at.slice(0, 10),
      icon: CheckCircle2,
      tone: "emerald",
      title: "Outcome recorded",
      body: decision.outcome.actual_outcome,
      detail: decision.outcome.actual_metrics && decision.outcome.actual_metrics.length
        ? decision.outcome.actual_metrics.map((m) => `${m.metric_name}: ${m.actual_value}${m.unit ? " " + m.unit : ""}`).join("  ·  ")
        : null,
    });
  }
  if (decision.ai_review && decision.ai_review.generated_at) {
    events.push({
      date: decision.ai_review.generated_at.slice(0, 10),
      icon: Sparkles,
      tone: "violet",
      title: "AI review",
      body: decision.ai_review.lesson,
    });
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  const toneMap = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="relative pl-6">
      <div className="absolute left-[15px] top-1 bottom-1 w-px bg-slate-200" />
      <div className="space-y-6">
        {events.map((e, i) => {
          const Icon = e.icon;
          return (
            <div key={i} className="relative">
              <div className={`absolute -left-6 top-0 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${toneMap[e.tone]}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="pt-0.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{shortDate(e.date)}</div>
                <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                {e.body && <p className="mt-0.5 text-sm text-slate-600">{e.body}</p>}
                {e.detail && <p className="text-xs text-slate-400 mt-0.5">{e.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}