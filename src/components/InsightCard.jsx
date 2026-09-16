import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Gauge, AlertTriangle, Layers } from "lucide-react";

const TYPE_ICON = {
  estimation_bias: TrendingUp,
  confidence_calibration: Gauge,
  category_performance: Layers,
  assumption_failure: AlertTriangle,
  cost_bias: TrendingUp,
  decision_speed: Gauge,
  other: Lightbulb,
};

const TYPE_LABEL = {
  estimation_bias: "Estimation bias",
  confidence_calibration: "Confidence calibration",
  category_performance: "Category performance",
  assumption_failure: "Assumption failure",
  cost_bias: "Cost bias",
  decision_speed: "Decision speed",
  other: "Pattern",
};

export default function InsightCard({ insight }) {
  const Icon = TYPE_ICON[insight.type] || Lightbulb;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px] font-medium border-slate-200 text-slate-500">
                {TYPE_LABEL[insight.type] || "Pattern"}
              </Badge>
              <span className="text-[11px] text-slate-400">{insight.evidence_count} decisions</span>
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900 leading-snug">{insight.title}</h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{insight.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}