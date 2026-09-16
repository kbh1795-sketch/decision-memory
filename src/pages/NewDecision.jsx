import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/lib/decisions";

export default function NewDecision() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    context: "",
    selected_option: "",
    reasoning: "",
    confidence: 70,
    category: "Engineering",
    customCategory: "",
    decision_date: new Date().toISOString().slice(0, 10),
    review_date: "",
  });
  const [options, setOptions] = useState([{ name: "" }, { name: "" }]);
  const [assumptions, setAssumptions] = useState([{ text: "" }]);
  const [metrics, setMetrics] = useState([{ metric_name: "", expected_value: "", unit: "" }]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const cleanOptions = options.map((o) => ({ name: o.name.trim() })).filter((o) => o.name);
      const cleanAssumptions = assumptions.map((a) => ({ text: a.text.trim(), result: "unknown" })).filter((a) => a.text);
      const cleanMetrics = metrics.map((m) => ({ metric_name: m.metric_name.trim(), expected_value: m.expected_value.trim(), unit: m.unit.trim() })).filter((m) => m.metric_name);
      const category = form.category === "__custom" ? form.customCategory.trim() || "Uncategorized" : form.category;
      const payload = {
        ...form,
        category,
        confidence: Number(form.confidence),
        options: cleanOptions,
        assumptions: cleanAssumptions,
        expected_metrics: cleanMetrics,
        selected_option: form.selected_option || (cleanOptions.length === 1 ? cleanOptions[0].name : ""),
        owner_name: user?.full_name || "You",
        status: "active",
      };
      const created = await base44.entities.Decision.create(payload);
      navigate(`/decisions/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-slate-500">
        <ArrowLeft className="h-4 w-4" /> 뒤로
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">새 결정</h1>
      <p className="mt-1 text-sm text-slate-500">무엇을 결정했는지, 무엇을 예상했는지, 언제 검토할지 기록하세요. 원본 기록은 영구히 보존됩니다.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>무엇을 결정했나요?</Label>
              <Input className="mt-1.5" placeholder="Base44로 첫 MVP를 구축한다." value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div>
              <Label>배경 — 해결하려던 문제는 무엇인가요?</Label>
              <Textarea className="mt-1.5" rows={3} value={form.context} onChange={(e) => set("context", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">검토한 선택지</CardTitle>
            <CardDescription>고려했던 각 선택지를 추가하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={`선택지 ${i + 1}`} value={o.name} onChange={(e) => setOptions((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                {options.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setOptions((arr) => arr.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((arr) => [...arr, { name: "" }])}>
              <Plus className="h-4 w-4" /> 선택지 추가
            </Button>
            <div className="pt-3">
              <Label>선택한 옵션</Label>
              <Select value={form.selected_option} onValueChange={(v) => set("selected_option", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="선택지 중 하나를 고르세요" /></SelectTrigger>
                <SelectContent>
                  {options.filter((o) => o.name.trim()).map((o, i) => (
                    <SelectItem key={i} value={o.name.trim()}>{o.name.trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">추론 및 가정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>왜 그것을 선택했나요?</Label>
              <Textarea className="mt-1.5" rows={3} value={form.reasoning} onChange={(e) => set("reasoning", e.target.value)} />
            </div>
            <div>
              <Label>가정</Label>
              <div className="mt-1.5 space-y-2">
                {assumptions.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="세우고 있는 가정" value={a.text} onChange={(e) => setAssumptions((arr) => arr.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                    {assumptions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setAssumptions((arr) => arr.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setAssumptions((arr) => [...arr, { text: "" }])}>
                <Plus className="h-4 w-4" /> 가정 추가
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">예상 결과</CardTitle>
            <CardDescription>무엇이 일어날 것이라 예상하나요? 나중에 비교할 수 있는 측정 가능한 지표를 추가하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>예상 결과</Label>
              <Textarea className="mt-1.5" rows={2} placeholder="3일 이내 작동하는 MVP." value={form.expected_outcome} onChange={(e) => set("expected_outcome", e.target.value)} />
            </div>
            <div>
              <Label>예상 지표</Label>
              <div className="mt-1.5 space-y-2">
                {metrics.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-5" placeholder="지표명 (예: 개발 시간)" value={m.metric_name} onChange={(e) => setMetrics((arr) => arr.map((x, j) => j === i ? { ...x, metric_name: e.target.value } : x))} />
                    <Input className="col-span-3" placeholder="값 (예: 3)" value={m.expected_value} onChange={(e) => setMetrics((arr) => arr.map((x, j) => j === i ? { ...x, expected_value: e.target.value } : x))} />
                    <Input className="col-span-3" placeholder="단위 (예: 일)" value={m.unit} onChange={(e) => setMetrics((arr) => arr.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                    {metrics.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setMetrics((arr) => arr.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setMetrics((arr) => [...arr, { metric_name: "", expected_value: "", unit: "" }])}>
                <Plus className="h-4 w-4" /> 지표 추가
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">신뢰도 및 검토</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <Label>이 결정이 예상 결과를 낼 것이라 얼마나 확신하나요?</Label>
                <span className="text-sm font-semibold text-slate-900">{form.confidence}%</span>
              </div>
              <Slider className="mt-3" value={[form.confidence]} max={100} step={1} onValueChange={(v) => set("confidence", v[0])} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>결정일</Label>
                <Input type="date" className="mt-1.5" value={form.decision_date} onChange={(e) => set("decision_date", e.target.value)} />
              </div>
              <div>
                <Label>검토일</Label>
                <Input type="date" className="mt-1.5" value={form.review_date} onChange={(e) => set("review_date", e.target.value)} />
              </div>
              <div>
                <Label>카테고리</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__custom">+ 사용자 정의…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.category === "__custom" && (
              <div>
                <Label>사용자 정의 카테고리</Label>
                <Input className="mt-1.5" value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/")}>취소</Button>
          <Button type="submit" disabled={saving}>{saving ? "저장 중…" : "결정 기록"}</Button>
        </div>
      </form>
    </div>
  );
}