import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Link2, AlertCircle } from "lucide-react";
import { STRENGTH_LABEL, STRENGTH_CLASSES, DIMENSION_LABEL, PROFILE_LABEL } from "@/lib/evidence";

export default function DecisionProfile() {
  const [reports, setReports] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [r, d] = await Promise.all([
      base44.entities.HistoryReport.list("-generated_at", 200).catch(() => []),
      base44.entities.Decision.list("-created_date", 500).catch(() => [])
    ]);
    setReports(r);
    setDecisions(d);
  };

  useEffect(() => { load(); }, []);

  const analyze = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await base44.functions.invoke("analyzeDecisionHistory", {});
      if (res.data && res.data.error) setError(res.data.error);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const dimensions = (reports || []).filter((r) => r.type === "dimension");
  const profile = (reports || []).filter((r) => r.type === "profile");
  const insufficient = (reports || []).filter((r) => r.type === "insufficient");
  const generatedAt = reports && reports.length ? reports[0].generated_at : null;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">내 결정 프로필</h1>
          <p className="mt-1 text-sm text-slate-500">실제 가져온 결정 데이터만 근거로 사용합니다. 모든 통계는 증거(구체 결정)와 함께 표시됩니다.</p>
        </div>
        <Button onClick={analyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzing ? "분석 중…" : "내 결정 이력 분석"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>결정 {decisions.length}개</span>
        {generatedAt && <span>· 마지막 분석 {new Date(generatedAt).toLocaleString("ko-KR")}</span>}
        <span className="ml-auto flex items-center gap-1">
          증거 강도:
          <span className="px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">약함 1–2</span>
          <span className="px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">부상 3–4</span>
          <span className="px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">강함 5+</span>
        </span>
      </div>

      {error && (
        <Card><CardContent className="pt-6 flex items-start gap-2 text-sm text-amber-700"><AlertCircle className="h-4 w-4 mt-0.5" /><span>{error}</span></CardContent></Card>
      )}

      {reports === null ? (
        <div className="p-8 text-sm text-slate-400">로딩 중…</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-slate-500 space-y-2">
          <p>아직 분석 보고서가 없습니다.</p>
          <p>먼저 <Link to="/import" className="text-primary underline">과거 결정 가져오기</Link>에서 실제 결정(실제 결과 포함)을 입력한 뒤 “내 결정 이력 분석”을 누르세요.</p>
        </CardContent></Card>
      ) : (
        <>
          {dimensions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">패턴 분석 (8 차원)</h2>
              {dimensions.map((r, i) => <FindingCard key={`d${i}`} report={r} titlePrefix={DIMENSION_LABEL[r.dimension] || r.dimension} />)}
            </section>
          )}
          {profile.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">개인 결정 프로필</h2>
              {profile.map((r, i) => <FindingCard key={`p${i}`} report={r} titlePrefix={PROFILE_LABEL[r.section] || r.section} />)}
            </section>
          )}
          {insufficient.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">증거 부족 영역</h2>
              <Card><CardContent className="pt-6 space-y-2">
                {insufficient.map((r, i) => (
                  <div key={i} className="text-sm text-slate-600"><span className="font-medium text-slate-800">{r.area}</span> — {r.reason}</div>
                ))}
              </CardContent></Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FindingCard({ report, titlePrefix }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{titlePrefix}</div>
            <div className="font-medium text-slate-900">{report.title}</div>
          </div>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded border ${STRENGTH_CLASSES[report.strength]}`}>
            {STRENGTH_LABEL[report.strength]} · {report.evidence_count}
          </span>
        </div>
        <p className="text-sm text-slate-600">{report.description}</p>
        {report.evidence && report.evidence.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Link2 className="h-3 w-3" /> 근거 결정</div>
            <div className="flex flex-wrap gap-1.5">
              {report.evidence.map((e, i) => (
                e.decision_id
                  ? <Link key={i} to={`/decisions/${e.decision_id}`} className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700">{e.decision_title}</Link>
                  : <span key={i} className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500">{e.decision_title}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}