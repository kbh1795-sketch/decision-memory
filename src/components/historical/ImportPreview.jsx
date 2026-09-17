import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function ImportPreview({ rows, onConfirm, onCancel, busy }) {
  const valid = rows.filter((r) => r.title);
  const invalid = rows.filter((r) => !r.title);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{valid.length}개</span> 유효한 결정
            {invalid.length > 0 && <span className="text-amber-600"> · {invalid.length}개 제목 누락(건너뜀)</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={busy}>취소</Button>
            <Button onClick={onConfirm} disabled={busy || valid.length === 0}>
              {busy ? "가져오는 중…" : `${valid.length}개 가져오기`}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2 font-medium">제목</th>
                <th className="text-left px-3 py-2 font-medium">결정일</th>
                <th className="text-left px-3 py-2 font-medium">카테고리</th>
                <th className="text-left px-3 py-2 font-medium">프로젝트</th>
                <th className="text-left px-3 py-2 font-medium">결과 있음</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {valid.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50/40" : ""}>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.title}</td>
                  <td className="px-3 py-2 text-slate-500">{r.decision_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{r.category || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{r.project || "—"}</td>
                  <td className="px-3 py-2">{r.outcome ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-slate-300" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}