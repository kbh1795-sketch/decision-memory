import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ASSUMPTION_META, formatDate, pctDiff, cx } from "@/lib/decisions";

export default function ReviewOutcome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ actual_outcome: "", result: "as_expected", explanation: "", learning: "" });
  const [actualMetrics, setActualMetrics] = useState([]);
  const [assumptions, setAssumptions] = useState([]);

  useEffect(() => {
    (async () => {
      const d = await base44.entities.Decision.get(id);
      setDecision(d);
      setActualMetrics((d.expected_metrics || []).map((m) => ({ metric_name: m.metric_name, actual_value: "", unit: m.unit })));
      setAssumptions((d.assumptions || []).map((a) => ({ text: a.text, result: a.result || "unknown" })));
    })();
  }, [id]);

  if (!decision) return <div className="p-8 text-sm text-slate-400">로딩 중…</div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanMetrics = actualMetrics.map((m) => ({ metric_name: m.metric_name, actual_value: String(m.actual_value).trim(), unit: m.unit })).filter((m) => m.actual_value !== "");
      const outcome = {
        actual_outcome: form.actual_outcome.trim(),
        actual_metrics: cleanMetrics,
        result: form.result,
        explanation: form.explanation.trim(),
        learning: form.learning.trim(),
        reviewed_at: new Date().toISOString(),
      };
      const updatedAssumptions = assumptions.map((a) => ({ text: a.text, result: a.result }));
      await base44.entities.Decision.update(id, { outcome, assumptions: updatedAssumptions, status: "reviewed" });

      // Generate AI review
      setGenerating(true);
      try {
        await base44.functions.invoke("generateDecisionReview", { decision_id: id });
      } catch (err) {
        console.error("AI review failed", err);
      } finally { setGenerating(false); }
      navigate(`/decisions/${id}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/decisions/${id}`)} className="mb-4 text-slate-500">
        <ArrowLeft className="h-4 w-4" /> 결정으로 돌아가기
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">결과 기록</h1>
      <p className="mt-1 text-sm text-slate-500">결정일 {formatDate(decision.decision_date)} · 검토 예정 {formatDate(decision.review_date)}.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{decision.title}</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-500">
            {decision.expected_outcome && <p><span className="text-slate-400">예상한 결과: </span>{decision.expected_outcome}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">실제 어떤 일이 있었나요?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>실제 결과</Label>
              <Textarea className="mt-1.5" rows={3} placeholder="실제 일어난 일을 설명하세요." value={form.actual_outcome} onChange={(e) => set("actual_outcome", e.target.value)} />
            </div>
            <div>
              <Label>실제 지표 — 예상과 비교</Label>
              {actualMetrics.length === 0 ? (
                <p className="text-sm text-slate-400 mt-1.5">이 결정에 기록된 예상 지표가 없습니다.</p>
              ) : (
                <div className="mt-1.5 space-y-2">
                  {actualMetrics.map((m, i) => {
                    const exp = (decision.expected_metrics || []).find((e) => e.metric_name === m.metric_name);
                    const diff = m.actual_value !== "" ? pctDiff(exp?.expected_value, m.actual_value) : null;
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <div className="text-sm font-medium text-slate-700">{m.metric_name}</div>
                          <div className="text-xs text-slate-400">예상 {exp ? `${exp.expected_value}${exp.unit ? " " + exp.unit : ""}` : "—"}</div>
                        </div>
                        <Input className="col-span-4" type="text" inputMode="decimal" placeholder="실제 값" value={m.actual_value} onChange={(e) => setActualMetrics((arr) => arr.map((x, j) => j === i ? { ...x, actual_value: e.target.value } : x))} />
                        <div className="col-span-3 text-right text-xs">
                          {diff !== null && (
                            <span className={cx("font-semibold", diff > 0 ? "text-rose-600" : diff < 0 ? "text-emerald-600" : "text-slate-500")}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label>결과</Label>
              <Select value={form.result} onValueChange={(v) => set("result", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="better">예상보다 좋음</SelectItem>
                  <SelectItem value="as_expected">예상과 일치</SelectItem>
                  <SelectItem value="worse">예상보다 나쁨</SelectItem>
                  <SelectItem value="mixed">혼합</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">가정 및 학습</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {assumptions.length > 0 && (
              <div>
                <Label>원래 가정이 맞았나요?</Label>
                <div className="mt-2 space-y-2">
                  {assumptions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-sm text-slate-600">• {a.text}</span>
                      <Select value={a.result} onValueChange={(v) => setAssumptions((arr) => arr.map((x, j) => j === i ? { ...x, result: v } : x))}>
                        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="correct">맞음</SelectItem>
                          <SelectItem value="partially_correct">부분적으로 맞음</SelectItem>
                          <SelectItem value="incorrect">틀림</SelectItem>
                          <SelectItem value="unknown">미정</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>차이의 원인은 무엇인가요?</Label>
              <Textarea className="mt-1.5" rows={3} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />
            </div>
            <div>
              <Label>무엇을 배웠나요? (선택)</Label>
              <Textarea className="mt-1.5" rows={2} value={form.learning} onChange={(e) => set("learning", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI 검토가 자동으로 생성됩니다.</p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/decisions/${id}`)}>취소</Button>
            <Button type="submit" disabled={saving}>{saving || generating ? (generating ? "AI 검토 생성 중…" : "저장 중…") : "저장 및 검토 생성"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}