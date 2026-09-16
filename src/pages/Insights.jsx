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

  if (decisions === null) return <div className="p-8 text-sm text-slate-400">로딩 중…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">결정 패턴</h1>
          <p className="mt-1 text-sm text-slate-500">{reviewed.length}개 검토된 결정 분석됨. 패턴은 데이터가 뒷받침될 때만 표시됩니다.</p>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "분석 중…" : "재분석"}
        </Button>
      </div>

      {!hasData && (
        <Card className="mt-6 border-amber-200 bg-amber-50/30">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">데이터 부족.</span> 패턴을 감지하려면 최소 2개의 검토된 결정이 필요합니다. 현재 {reviewed.length}개 있습니다.
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Card className="mt-6"><CardContent className="p-4 text-sm text-slate-600">{message}</CardContent></Card>
      )}

      {/* Recurring patterns (AI) */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">반복되는 패턴</h2>
        {insights.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-slate-400">아직 감지된 패턴이 없습니다. 결정을 검토한 후 “재분석”을 클릭하세요.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}
      </section>

      {/* Forecast accuracy */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">예측 정확도</h2>
        {metricGroups.length === 0 ? (
          <EmptyChart message="아직 일치하는 예상/실제 지표가 없습니다." />
        ) : (
          <Card>
            <CardHeader><CardDescription>예상값과 실제값의 평균 % 차이. 양수(빨강) = 실제가 예상을 초과, 음수(초록) = 실제가 더 낮음.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metricGroups} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} unit="%" />
                  <Tooltip formatter={(v) => [`${v.toFixed(0)}%`, "평균 편차"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">신뢰도 보정</h2>
          {calibration.length === 0 ? (
            <EmptyChart message="아직 검토된 결정이 없습니다." />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={calibration} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`${v}%`, "예상과 일치 또는 더 좋음"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="successRate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-slate-400">성공률 = 예상과 일치하거나 더 나은 결정의 비율. 잘 보정된 신뢰도는 100% 선을 따라갑니다.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Category performance radar */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">카테고리 성과</h2>
          {categoryData.length === 0 ? (
            <EmptyChart message="아직 검토된 결정이 없습니다." />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={categoryData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Radar name="성공률" dataKey="successRate" stroke="#0f766e" fill="#0f766e" fillOpacity={0.3} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-slate-400">카테고리별 성공률 — 예측이 정확한 경향이 있는 영역.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Strongest / weakest */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">가장 강한 결정 카테고리</h2>
          {strongest.length === 0 ? <EmptyChart message="아직 데이터가 없습니다." /> : (
            <Card><CardContent className="pt-6 space-y-2">
              {strongest.slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.successRate}% 적중 · 평균 오차 {c.avgError}% · {c.total}개 결정</span>
                </div>
              ))}
            </CardContent></Card>
          )}
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">가장 약한 예측 영역</h2>
          {weakest.length === 0 ? <EmptyChart message="아직 데이터가 없습니다." /> : (
            <Card><CardContent className="pt-6 space-y-2">
              {weakest.slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.successRate}% 적중 · 평균 오차 {c.avgError}% · {c.total}개 결정</span>
                </div>
              ))}
            </CardContent></Card>
          )}
        </section>
      </div>

      {/* Common failed assumptions */}
      <section className="mt-10 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">공통 실패 가정</h2>
        {failedAssumptions.length === 0 ? (
          <EmptyChart message="아직 반복되는 가정(2회 이상)이 없습니다." />
        ) : (
          <Card><CardContent className="pt-6 space-y-2">
            {failedAssumptions.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">“{a.text}”</span>
                <span className="text-xs text-slate-500 shrink-0">틀림 {a.incorrect} · 부분 {a.partially} · 맞음 {a.correct} (총 {a.total})</span>
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