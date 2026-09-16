import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, ArrowRight, AlertCircle, Sparkles, ClipboardList, CalendarClock } from "lucide-react";
import DecisionCard from "@/components/DecisionCard";
import InsightCard from "@/components/InsightCard";
import { computeStatus, formatDate } from "@/lib/decisions";

export default function Dashboard() {
  const [decisions, setDecisions] = useState(null);
  const [insights, setInsights] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
      } catch { setUser(null); }
      const list = await base44.entities.Decision.list("-created_date", 200);
      setDecisions(list);
      try {
        const ins = await base44.entities.Insight.list("-generated_at", 6);
        setInsights(ins);
      } catch { setInsights([]); }
    })();
  }, []);

  if (decisions === null) {
    return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  }

  const active = decisions.filter((d) => computeStatus(d) === "active");
  const ready = decisions.filter((d) => computeStatus(d) === "ready_for_review");
  const reviewed = decisions.filter((d) => computeStatus(d) === "reviewed");

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.full_name ? `${user.full_name} · ` : ""}{decisions.length} decisions recorded, {reviewed.length} reviewed.
          </p>
        </div>
        <Button asChild>
          <Link to="/new"><PlusCircle className="h-4 w-4" /> New Decision</Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="Active decisions" value={active.length} tone="slate" />
        <StatCard icon={CalendarClock} label="Ready for review" value={ready.length} tone="amber" />
        <StatCard icon={Sparkles} label="Patterns detected" value={insights.length} tone="violet" />
      </div>

      {ready.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ready for review</h2>
          </div>
          <div className="space-y-3">
            {ready.map((d) => (
              <Card key={d.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-amber-700 font-medium">
                      Review due {formatDate(d.review_date)}
                    </div>
                    <h3 className="mt-0.5 text-[15px] font-semibold text-slate-900">{d.title}</h3>
                    {d.expected_metrics && d.expected_metrics.length > 0 && (
                      <p className="mt-1 text-sm text-slate-500">
                        Expected: {d.expected_metrics.map((m) => `${m.metric_name} ${m.expected_value}${m.unit ? " " + m.unit : ""}`).join("  ·  ")}
                      </p>
                    )}
                  </div>
                  <Button asChild variant="default" className="shrink-0">
                    <Link to={`/decisions/${d.id}/review`}>Review outcome <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Active decisions</h2>
        {active.length === 0 ? (
          <EmptyState message="No active decisions. Record your next decision to start building memory." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((d) => <DecisionCard key={d.id} decision={d} />)}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent patterns</h2>
          <Link to="/insights" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {insights.length === 0 ? (
          <EmptyState message="No patterns yet. Patterns appear once decisions are reviewed and analysed." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.slice(0, 4).map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-900 leading-none">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-slate-400">{message}</CardContent>
    </Card>
  );
}