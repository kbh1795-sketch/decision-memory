import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import InsightCard from "@/components/InsightCard";
import { parseMetricValue, formatDate } from "@/lib/decisions";

export default function Insights() {
  const [decisions, setDecisions] = useState(null);
  const [insights, setInsights] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const list = await base44.entities.Decision.list("-created_date", 500);
    setDecisions(list);
    const ins = await base44.entities.Insight.list("-generated_at", 50);
    setInsights(ins);
  };
  useEffect(() => { load(); }, []);

  const reviewed = useMemo(() => (decisions || []).filter((d) => d.status === "reviewed" && d.outcome), [decisions]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateInsights", {});
      setMessage(res.data?.message || null);
      await load();
    } catch (err) {
      setMessage(err.message || "Failed to generate insights");
    } finally { setGenerating(false); }
  };

  // Forecast accuracy: group metric comparisons by metric name
  const metricGroups = useMemo(() => {
    const groups = {};
    for (const d of reviewed) {
      const actuals = d.outcome.actual_metrics || [];
      for (const e of (d.expected_metrics || [])) {
        const a = actuals.find((x) => x.metric_name.trim().toLowerCase() === e.metric_name.trim().toLowerCase());
        if (!a) continue;
        const exp = parseMetricValue(e.expected_value);
        const act = parseMetricValue(a.actual_value);
        if (exp === null || act === null || exp === 0) continue;
        const pct = ((act - exp) / Math.abs(exp)) * 100;
        const key = e.metric_name.trim();
        if (!groups[key]) groups[key] = { name: key, diffs: [], count: 0 };
        groups[key].diffs.push(pct);
        groups[key].count += 1;
      }
    }
    return Object.values(groups).filter((g) => g.count >= 1).map((g) => ({
      name: g.name,
      avg: g.diffs.reduce((a, b) => a + b, 0) / g.diffs.length,
      count: g.count,
    }));
  }, [reviewed]);

  // Confidence calibration
  const calibration = useMemo(() => {
    const buckets = [
      { range: "0–40%", min: 0, max: 40, total: 0, success: 0 },
      { range: "41–70%", min: 41, max: 70, total: 0, success: 0 },
      { range: "71–90%", min: 71, max: 90, total: 0, success: 0 },
      { range: "91–100%", min: 91, max: 100, total: 0, success: 0 },
    ];
    for (const d of reviewed) {
      const c = typeof d.confidence === "number" ? d.confidence : 0;
      const b = buckets.find((x) => c >= x.min && c <= x.max);
      if (!b) continue;
      b.total += 1;
      if (d.outcome.result === "as_expected" || d.outcome.result === "better") b.success += 1;
    }
    return buckets.filter((b) => b.total > 0).map((b) => ({ range: b.range, successRate: b.total ? Math.round((b.success / b.total) * 100) : 0, total: b.total }));
  }, [reviewed]);

  // Category performance
  const categoryData = useMemo(() => {
    const cats = {};
    for (const d of reviewed) {
      const cat = d.category || "Uncategorized";
      if (!cats[cat]) cats[cat] = { name: cat, total: 0, success: 0, diffs: [] };
      cats[cat].total += 1;
      if (d.outcome.result === "as_expected" || d.outcome.result === "better") cats[cat].success += 1;
      const actuals = d.outcome.actual_metrics || [];
      for (const e of (d.expected_metrics || [])) {
        const a = actuals.find((x) => x.metric_name.trim().toLowerCase() === e.metric_name.trim().toLowerCase());
        if (!a) continue;
        const exp = parseMetricValue(e.expected_value);
        const act = parseMetricValue(a.actual_value);
        if (exp !== null && act !== null && exp !== 0) cats[cat].diffs.push(Math.abs((act - exp) / Math.abs(exp)) * 100);
      }
    }
    return Object.values(cats).map((c) => ({
      name: c.name,
      successRate: c.total ? Math.round((c.success / c.total) * 100) : 0,
      avgError: c.diffs.length ? Math.round(c.diffs.reduce((a, b) => a + b, 0) / c.diffs.length) : 0,
      total: c.total,
    }));
  }, [reviewed]);

  // Common failed assumptions
  const failedAssumptions = useMemo(() => {
    const map = {};
    for (const d of reviewed) {
      for (const a of (d.assumptions || [])) {
        if (!a.text) continue;
        const key = a.text.trim().toLowerCase();
        if (!map[key]) map[key] = { text: a.text, incorrect: 0, partially: 0, correct: 0, total: 0 };
        map[key].total += 1;
        if (a.result === "incorrect") map[key].incorrect += 1;
        else if (a.result === "partially_correct") map[key].partially += 1;
        else if (a.result === "correct") map[key].correct += 1;
      }
    }
    return Object.values(map).filter((a) => a.total >= 2).sort((a, b) => (b.incorrect + b.partially) - (a.incorrect + a.partially));
  }, [reviewed]);

  const strongest = [...categoryData].sort((a, b) => b.successRate - a.successRate || a.avgError - b.avgError);
  const weakest = [...categoryData].sort((a, b) => a.successRate - b.successRate || b.avgError - a.avgError);

  const hasData = reviewed.length >= 2;

  if (decisions === null) return <div className="p-8 text-sm text-slate-400">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Decision Patterns</h1>
          <p className="mt-1 text-sm text-slate-500">{reviewed.length} reviewed decisions analysed. Patterns are only shown when supported by data.</p>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Analysing…" : "Re-run analysis"}
        </Button>
      </div>

      {!hasData && (
        <Card className="mt-6 border-amber-200 bg-amber-50/30">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Insufficient data.</span> At least 2 reviewed decisions are needed to detect patterns. You currently have {reviewed.length}.
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Card className="mt-6"><CardContent className="p-4 text-sm text-slate-600">{message}</CardContent></Card>
      )}

      {/* Recurring patterns (AI) */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Recurring patterns</h2>
        {insights.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-slate-400">No patterns detected yet. Click “Re-run analysis” after reviewing decisions.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}
      </section>

      {/* Forecast accuracy */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Forecast accuracy</h2>
        {metricGroups.length === 0 ? (
          <EmptyChart message="No matched expected/actual metrics yet." />
        ) : (
          <Card>
            <CardHeader><CardDescription>Average % difference between expected and actual values. Positive (red) = actual exceeded expectation; negative (green) = actual came in lower.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metricGroups} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} unit="%" />
                  <Tooltip formatter={(v) => [`${v.toFixed(0)}%`, "Avg deviation"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {metricGroups.map((g, i) => <Cell key={i} fill={g.avg > 0 ? "#e11d48" : "#059669"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence calibration */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Confidence calibration</h2>
          {calibration.length === 0 ? (
            <EmptyChart message="No reviewed decisions yet." />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={calibration} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`${v}%`, "Succeeded as/better than expected"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="successRate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-slate-400">Success rate = share of decisions that came in as-expected or better. Well-calibrated confidence tracks the 100% line.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Category performance radar */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Category performance</h2>
          {categoryData.length === 0 ? (
            <EmptyChart message="No reviewed decisions yet." />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={categoryData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Radar name="Success rate" dataKey="successRate" stroke="#0f766e" fill="#0f766e" fillOpacity={0.3} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-slate-400">Success rate by category — where your estimates tend to be accurate.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Strongest / weakest */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Strongest decision categories</h2>
          {strongest.length === 0 ? <EmptyChart message="No data yet." /> : (
            <Card><CardContent className="pt-6 space-y-2">
              {strongest.slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.successRate}% on target · avg error {c.avgError}% · {c.total} decisions</span>
                </div>
              ))}
            </CardContent></Card>
          )}
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Weakest forecast areas</h2>
          {weakest.length === 0 ? <EmptyChart message="No data yet." /> : (
            <Card><CardContent className="pt-6 space-y-2">
              {weakest.slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.successRate}% on target · avg error {c.avgError}% · {c.total} decisions</span>
                </div>
              ))}
            </CardContent></Card>
          )}
        </section>
      </div>

      {/* Common failed assumptions */}
      <section className="mt-10 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Common failed assumptions</h2>
        {failedAssumptions.length === 0 ? (
          <EmptyChart message="No recurring assumptions (2+ occurrences) yet." />
        ) : (
          <Card><CardContent className="pt-6 space-y-2">
            {failedAssumptions.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">“{a.text}”</span>
                <span className="text-xs text-slate-500 shrink-0">{a.incorrect} incorrect · {a.partially} partial · {a.correct} correct (of {a.total})</span>
              </div>
            ))}
          </CardContent></Card>
        )}
      </section>
    </div>
  );
}

function EmptyChart({ message }) {
  return <Card><CardContent className="p-8 text-center text-sm text-slate-400">{message}</CardContent></Card>;
}