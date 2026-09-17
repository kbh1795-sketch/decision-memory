import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, Download, History } from "lucide-react";
import HistoricalDecisionForm from "@/components/historical/HistoricalDecisionForm";
import ImportPreview from "@/components/historical/ImportPreview";
import { parseCsv, normalizeImportRow, CSV_TEMPLATE } from "@/lib/historicalImport";
import { useToast } from "@/components/ui/use-toast";

export default function ImportDecisions() {
  const [tab, setTab] = useState("manual");
  const [existing, setExisting] = useState([]);
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Decision.list("-created_date", 500).then(setExisting).catch(() => {});
  }, []);

  const handleManual = async (decision) => {
    setBusy(true);
    try {
      await base44.entities.Decision.create(decision);
      setSavedCount((n) => n + 1);
      setExisting((e) => [{ ...decision, id: "tmp" + Date.now() }, ...e]);
      toast({ title: "저장됨", description: decision.title });
    } catch (err) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setFileText(text);
    parseText(text, f.name);
  };

  const parseText = (text, name) => {
    const trimmed = text.trim();
    if (!trimmed) { setPreviewRows(null); return; }
    let rows = [];
    let isJson = false;
    if (name && name.toLowerCase().endsWith(".json")) isJson = true;
    else if (trimmed.startsWith("[") || trimmed.startsWith("{")) isJson = true;
    if (isJson) {
      try {
        const parsed = JSON.parse(trimmed);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        toast({ title: "JSON 파싱 실패", variant: "destructive" });
        setPreviewRows(null);
        return;
      }
    } else {
      rows = parseCsv(trimmed);
    }
    const normalized = rows.map((r) => normalizeImportRow(r, existing));
    setPreviewRows(normalized);
  };

  const handleTextarea = (v) => {
    setFileText(v);
    parseText(v, fileName);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decision_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmImport = async () => {
    const valid = previewRows.filter((r) => r.title);
    if (!valid.length) return;
    setBusy(true);
    try {
      await base44.entities.Decision.bulkCreate(valid);
      setExisting((e) => [...valid.map((d) => ({ ...d, id: "tmp" + Math.random() })), ...e]);
      setSavedCount((n) => n + valid.length);
      toast({ title: "가져오기 완료", description: `${valid.length}개 결정 저장됨` });
      setPreviewRows(null);
      setFileText("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast({ title: "가져오기 실패", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">과거 결정 가져오기</h1>
        <p className="mt-1 text-sm text-slate-500">실제 과거 결정을 평가 데이터로 입력합니다. 당시 정보와 사후 정보를 분리해 기록하세요.</p>
        {savedCount > 0 && <p className="mt-2 text-xs text-emerald-600">이번 세션에서 {savedCount}개 저장됨.</p>}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "manual", label: "수동 입력", icon: History },
          { id: "file", label: "CSV / JSON 가져오기", icon: FileUp }
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "manual" && (
        <HistoricalDecisionForm existingDecisions={existing} onSubmit={handleManual} submitLabel={busy ? "저장 중…" : "저장 후 계속"} />
      )}

      {tab === "file" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">파일 가져오기</CardTitle>
              <CardDescription>JSON 배열(권장, 중첩 데이터 가능) 또는 CSV. CSV 템플릿을 다운로드해 열을 맞추세요. 목록/지표 필드는 세미콜론(;) 또는 JSON 문자열로 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => fileRef.current && fileRef.current.click()}><Upload className="h-4 w-4" /> 파일 선택</Button>
                <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4" /> CSV 템플릿</Button>
                <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={onFile} />
                {fileName && <span className="text-sm text-slate-500 self-center">{fileName}</span>}
              </div>
              <Textarea rows={8} placeholder='JSON 예: [{"title":"...","expected_outcome":"...","actual_outcome":"..."}] 또는 CSV 본문' value={fileText} onChange={(e) => handleTextarea(e.target.value)} />
            </CardContent>
          </Card>

          {previewRows && (
            <ImportPreview rows={previewRows} busy={busy} onConfirm={confirmImport} onCancel={() => { setPreviewRows(null); setFileText(""); setFileName(""); }} />
          )}
        </div>
      )}
    </div>
  );
}