import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Lock, Eye } from "lucide-react";
import { blankForm, formToDecision } from "@/lib/historicalImport";

const CATEGORIES = ["연구", "소프트웨어 개발", "도구", "프로젝트 선택", "출판", "대회", "기술 아키텍처", "기타"];
const ASSUMPTION_RESULTS = [
  { value: "unknown", label: "미정" },
  { value: "correct", label: "맞음" },
  { value: "partially_correct", label: "부분적으로 맞음" },
  { value: "incorrect", label: "틀림" }
];
const OUTCOME_RESULTS = [
  { value: "", label: "—" },
  { value: "better", label: "예상보다 좋음" },
  { value: "as_expected", label: "예상과 일치" },
  { value: "worse", label: "예상보다 나쁨" },
  { value: "mixed", label: "혼합" }
];

export default function HistoricalDecisionForm({ existingDecisions, onSubmit, submitLabel = "저장" }) {
  const [form, setForm] = useState(blankForm());
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addRow = (key, blank) => set(key, [...form[key], blank]);
  const delRow = (key, i) => set(key, form[key].filter((_, j) => j !== i));
  const setRow = (key, i, patch) => set(key, form[key].map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const decision = formToDecision(form, existingDecisions);
    if (!decision.title) return;
    onSubmit(decision);
    setForm(blankForm());
  };

  const otherDecisions = existingDecisions.filter((d) => d.title);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AT THE TIME */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-slate-500" /> 당시에 알고 있었던 정보</CardTitle>
          <CardDescription>결정 당시에 실제로 가지고 있던 정보만 입력하세요. 사후 정보는 아래 별도 섹션에 기록합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>결정 제목 *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="예: Base44로 MVP 구축" required />
            </div>
            <div className="space-y-1.5">
              <Label>결정일</Label>
              <Input type="date" value={form.decision_date} onChange={(e) => set("decision_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>프로젝트</Label>
              <Input value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="예: 결정 메모리 MVP" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>배경 (Context)</Label>
            <Textarea rows={2} value={form.context} onChange={(e) => set("context", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>검토한 선택지</Label>
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={(e) => setRow("options", i, e.target.value)} placeholder={`선택지 ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" onClick={() => delRow("options", i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addRow("options", "")}><Plus className="h-4 w-4" /> 선택지 추가</Button>
          </div>
          <div className="space-y-1.5">
            <Label>선택한 옵션</Label>
            <Input value={form.selected_option} onChange={(e) => set("selected_option", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>당시 추론</Label>
            <Textarea rows={2} value={form.reasoning} onChange={(e) => set("reasoning", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>당시 가정</Label>
            {form.assumptions.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input value={a.text} onChange={(e) => setRow("assumptions", i, { text: e.target.value })} placeholder={`가정 ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" onClick={() => delRow("assumptions", i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addRow("assumptions", { text: "", result: "unknown" })}><Plus className="h-4 w-4" /> 가정 추가</Button>
          </div>

          <div className="space-y-1.5">
            <Label>예상 결과</Label>
            <Textarea rows={2} value={form.expected_outcome} onChange={(e) => set("expected_outcome", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>예상 지표 (정량)</Label>
            {form.expected_metrics.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-5" value={m.metric_name} onChange={(e) => setRow("expected_metrics", i, { metric_name: e.target.value })} placeholder="지표명" />
                <Input className="col-span-4" value={m.expected_value} onChange={(e) => setRow("expected_metrics", i, { expected_value: e.target.value })} placeholder="예상값" />
                <Input className="col-span-2" value={m.unit} onChange={(e) => setRow("expected_metrics", i, { unit: e.target.value })} placeholder="단위" />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => delRow("expected_metrics", i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addRow("expected_metrics", { metric_name: "", expected_value: "", unit: "" })}><Plus className="h-4 w-4" /> 지표 추가</Button>
          </div>

          <div className="space-y-1.5">
            <Label>당시 신뢰도 (%)</Label>
            <Input type="number" min="0" max="100" value={form.confidence} onChange={(e) => set("confidence", e.target.value)} placeholder="기억나지 않으면 비워두세요 (Unknown)" />
            <p className="text-xs text-slate-400">기억나지 않으면 비워두세요. AI가 임의로 채우지 않습니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* LEARNED AFTERWARD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> 나중에 알게 된 정보</CardTitle>
          <CardDescription>사후에 알게 된 결과만 입력하세요. 위의 당시 정보와 섞이지 않도록 별도로 보관됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>실제 결과</Label>
            <Textarea rows={2} value={form.actual_outcome} onChange={(e) => set("actual_outcome", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>실제 지표</Label>
            {form.actual_metrics.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-5" value={m.metric_name} onChange={(e) => setRow("actual_metrics", i, { metric_name: e.target.value })} placeholder="지표명" />
                <Input className="col-span-4" value={m.actual_value} onChange={(e) => setRow("actual_metrics", i, { actual_value: e.target.value })} placeholder="실제값" />
                <Input className="col-span-2" value={m.unit} onChange={(e) => setRow("actual_metrics", i, { unit: e.target.value })} placeholder="단위" />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => delRow("actual_metrics", i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addRow("actual_metrics", { metric_name: "", actual_value: "", unit: "" })}><Plus className="h-4 w-4" /> 지표 추가</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>결과/검토 일자</Label>
              <Input type="date" value={form.review_date} onChange={(e) => set("review_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>결과 분류</Label>
              <Select value={form.result || "none"} onValueChange={(v) => set("result", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {OUTCOME_RESULTS.map((r) => <SelectItem key={r.value || "none"} value={r.value || "none"}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>실제 원인 (무엇이 결과를 이끌었나)</Label>
            <Textarea rows={2} value={form.cause} onChange={(e) => set("cause", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>가정 결과 (사후 평가)</Label>
            {form.assumptions.length === 0 && <p className="text-sm text-slate-400">당시 가정을 먼저 입력하세요.</p>}
            {form.assumptions.map((a, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input className="flex-1" value={a.text} readOnly placeholder={`가정 ${i + 1}`} />
                <Select value={a.result} onValueChange={(v) => setRow("assumptions", i, { result: v })}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSUMPTION_RESULTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>상위(부모) 결정</Label>
              <Select value={form.parent_decision_id} onValueChange={(v) => set("parent_decision_id", v)}>
                <SelectTrigger><SelectValue placeholder="없음" /></SelectTrigger>
                <SelectContent>
                  {otherDecisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>관련 결정</Label>
            <div className="flex flex-wrap gap-2">
              {form.related_decision_ids.map((id) => {
                const d = otherDecisions.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                    {d ? d.title : id}
                    <button type="button" onClick={() => set("related_decision_ids", form.related_decision_ids.filter((x) => x !== id))} className="text-slate-400 hover:text-slate-600">×</button>
                  </span>
                );
              })}
            </div>
            <Select value="" onValueChange={(v) => { if (v && !form.related_decision_ids.includes(v)) set("related_decision_ids", [...form.related_decision_ids, v]); }}>
              <SelectTrigger><SelectValue placeholder="관련 결정 추가" /></SelectTrigger>
              <SelectContent>
                {otherDecisions.filter((d) => !form.related_decision_ids.includes(d.id)).map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}