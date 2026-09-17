import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GitBranch, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/decisions";

export default function DecisionChains() {
  const [decisions, setDecisions] = useState(null);

  useEffect(() => {
    base44.entities.Decision.list("-created_date", 500).then(setDecisions).catch(() => setDecisions([]));
  }, []);

  if (decisions === null) return <div className="p-8 text-sm text-slate-400">로딩 중…</div>;
  if (decisions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">결정 체인</h1>
        <Card className="mt-4"><CardContent className="pt-6 text-sm text-slate-500">아직 결정이 없습니다. <Link to="/import" className="underline">과거 결정 가져오기</Link>에서 결정을 입력하고 프로젝트/상위 결정을 연결하세요.</CardContent></Card>
      </div>
    );
  }

  const byId = {};
  for (const d of decisions) byId[d.id] = d;

  // group by project
  const projects = {};
  const noProject = [];
  for (const d of decisions) {
    if (d.project && d.project.trim()) {
      (projects[d.project] ||= []).push(d);
    } else {
      noProject.push(d);
    }
  }

  const renderNode = (d, depth) => {
    const children = decisions.filter((x) => x.parent_decision_id === d.id);
    return (
      <div key={d.id} className="relative" style={{ paddingLeft: depth * 20 }}>
        {depth > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" style={{ marginLeft: 8 }} />}
        <div className="flex items-start gap-2 py-1.5">
          <ChevronRight className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
          <Link to={`/decisions/${d.id}`} className="group">
            <div className="text-sm font-medium text-slate-800 group-hover:underline">{d.title}</div>
            <div className="text-xs text-slate-400">
              {formatDate(d.decision_date)} · {d.category || "미분류"}
              {d.outcome?.result && ` · 결과: ${d.outcome.result}`}
            </div>
          </Link>
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">결정 체인</h1>
        <p className="mt-1 text-sm text-slate-500">프로젝트별로 상위 결정을 따라 연결된 결정의 흐름을 보여줍니다. 여러 결정이 한 프로젝트의 단계일 수 있습니다.</p>
      </div>

      {Object.keys(projects).length === 0 && noProject.length > 0 && (
        <Card><CardContent className="pt-6 text-sm text-slate-500">프로젝트가 지정된 결정이 없습니다. 결정에 프로젝트와 상위 결정을 연결하면 체인이 표시됩니다.</CardContent></Card>
      )}

      {Object.entries(projects).map(([name, items]) => {
        const roots = items.filter((d) => !d.parent_decision_id || !byId[d.parent_decision_id]);
        const startNodes = roots.length ? roots : items;
        return (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4 text-slate-500" /> {name}</CardTitle>
              <CardDescription>{items.length}개 결정</CardDescription>
            </CardHeader>
            <CardContent>
              {startNodes.map((d) => renderNode(d, 0))}
            </CardContent>
          </Card>
        );
      })}

      {noProject.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">프로젝트 미지정 결정</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {noProject.map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="block text-sm text-slate-700 hover:underline">
                {d.title} <span className="text-xs text-slate-400">· {formatDate(d.decision_date)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}