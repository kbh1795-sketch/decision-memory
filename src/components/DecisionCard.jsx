import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeStatus, STATUS_META, formatDate, cx } from "@/lib/decisions";

export default function DecisionCard({ decision }) {
  const status = computeStatus(decision);
  const meta = STATUS_META[status];
  return (
    <Link to={`/decisions/${decision.id}`} className="block group">
      <Card className="transition-all hover:shadow-md hover:border-slate-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {decision.category && (
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{decision.category}</span>
                )}
              </div>
              <h3 className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug group-hover:text-slate-700">
                {decision.title}
              </h3>
            </div>
            <span className={cx("inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.className)}>
              {meta.label}
            </span>
          </div>

          {decision.context && (
            <p className="mt-2 text-sm text-slate-500 line-clamp-2">{decision.context}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <div className="text-slate-400">담당자</div>
              <div className="text-slate-700 font-medium truncate">{decision.owner_name || "본인"}</div>
            </div>
            <div>
              <div className="text-slate-400">신뢰도</div>
              <div className="text-slate-700 font-medium">{decision.confidence != null ? `${decision.confidence}%` : "—"}</div>
            </div>
            <div>
              <div className="text-slate-400">결정일</div>
              <div className="text-slate-700 font-medium">{formatDate(decision.decision_date)}</div>
            </div>
            <div>
              <div className="text-slate-400">검토일</div>
              <div className="text-slate-700 font-medium">{formatDate(decision.review_date)}</div>
            </div>
          </div>

          {decision.expected_metrics && decision.expected_metrics.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">예상 결과</div>
              <p className="text-sm text-slate-600 line-clamp-2">
                {decision.expected_metrics.map((m) => `${m.metric_name}: ${m.expected_value}${m.unit ? " " + m.unit : ""}`).join("  ·  ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}