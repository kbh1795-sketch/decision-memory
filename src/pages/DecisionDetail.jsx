import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, MessageSquare, Send, Lock } from "lucide-react";
import Timeline from "@/components/Timeline";
import { computeStatus, STATUS_META, RESULT_META, ASSUMPTION_META, formatDate, pctDiff, cx } from "@/lib/decisions";

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const d = await base44.entities.Decision.get(id);
    setDecision(d);
  };
  useEffect(() => { load(); }, [id]);

  if (!decision) return <div className="p-8 text-sm text-slate-400">Loading…</div>;

  const status = computeStatus(decision);
  const statusMeta = STATUS_META[status];
  const resultMeta = decision.outcome ? RESULT_META[decision.outcome.result] : null;

  const addComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const updated = [...(decision.comments || []), { author_name: user?.full_name || "You", text: comment.trim(), created_at: new Date().toISOString() }];
      await base44.entities.Decision.update(id, { comments: updated });
      setComment("");
      setDecision({ ...decision, comments: updated });
    } finally { setPosting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 md:py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {decision.category && <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{decision.category}</span>}
            <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", statusMeta.className)}>{statusMeta.label}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{decision.title}</h1>
        </div>
        {status === "ready_for_review" && (
          <Button onClick={() => navigate(`/decisions/${id}/review`)}>Review outcome</Button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Original record</CardTitle>
              <CardDescription className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Preserved as recorded — hindsight does not rewrite what was originally believed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <Field label="Context" value={decision.context} />
              <Field label="Options considered" value={decision.options && decision.options.length ? decision.options.map((o) => o.name).join(" · ") : null} />
              <Field label="Selected option" value={decision.selected_option} highlight />
              <Field label="Reasoning" value={decision.reasoning} />
              <Field label="Expected outcome" value={decision.expected_outcome} />
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">Assumptions</div>
                {decision.assumptions && decision.assumptions.length ? (
                  <ul className="space-y-1.5">
                    {decision.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-slate-600">• {a.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">Expected metrics</div>
                {decision.expected_metrics && decision.expected_metrics.length ? (
                  <div className="flex flex-wrap gap-2">
                    {decision.expected_metrics.map((m, i) => (
                      <span key={i} className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                        {m.metric_name}: <span className="font-semibold ml-1">{m.expected_value}{m.unit ? " " + m.unit : ""}</span>
                      </span>
                    ))}
                  </div>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <Mini label="Confidence" value={decision.confidence != null ? `${decision.confidence}%` : "—"} />
                <Mini label="Decision date" value={formatDate(decision.decision_date)} />
                <Mini label="Review date" value={formatDate(decision.review_date)} />
              </div>
            </CardContent>
          </Card>

          {decision.outcome && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Outcome review</CardTitle>
                  {resultMeta && <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", resultMeta.className)}>{resultMeta.label}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <Field label="What actually happened" value={decision.outcome.actual_outcome} />
                {decision.outcome.actual_metrics && decision.outcome.actual_metrics.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Expected vs actual</div>
                    <div className="space-y-2">
                      {decision.outcome.actual_metrics.map((m, i) => {
                        const exp = (decision.expected_metrics || []).find((e) => e.metric_name.trim().toLowerCase() === m.metric_name.trim().toLowerCase());
                        const diff = exp ? pctDiff(exp.expected_value, m.actual_value) : null;
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                            <span className="text-slate-700 font-medium">{m.metric_name}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-400">exp {exp ? `${exp.expected_value}${exp.unit ? " " + exp.unit : ""}` : "—"}</span>
                              <span className="text-slate-900 font-semibold">{m.actual_value}{m.unit ? " " + m.unit : ""}</span>
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
                  </div>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Were the assumptions correct?</div>
                  <div className="space-y-2">
                    {decision.assumptions.map((a, i) => {
                      const meta = ASSUMPTION_META[a.result || "unknown"];
                      return (
                        <div key={i} className="flex items-start justify-between gap-3">
                          <span className="text-slate-600 text-sm">• {a.text}</span>
                          <span className={cx("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.className)}>{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Field label="What caused the difference" value={decision.outcome.explanation} />
                <Field label="What you learned" value={decision.outcome.learning} />
              </CardContent>
            </Card>
          )}

          {decision.ai_review && (
            <Card className="border-violet-200 bg-violet-50/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-base">AI decision review</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <AIField label="What happened" value={decision.ai_review.what_happened} />
                <AIField label="Largest estimation error" value={decision.ai_review.largest_error} />
                <AIField label="Incorrect assumption" value={decision.ai_review.incorrect_assumption} />
                <AIField label="What was predicted correctly" value={decision.ai_review.predicted_correctly} />
                <AIField label="Lesson" value={decision.ai_review.lesson} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-500" /><CardTitle className="text-base">Comments</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(decision.comments || []).length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              {(decision.comments || []).map((c, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-xs font-medium text-slate-500">{c.author_name} · {formatDate(c.created_at)}</div>
                  <div className="mt-0.5 text-sm text-slate-700">{c.text}</div>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Textarea rows={2} placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button onClick={addComment} disabled={posting || !comment.trim()} className="self-end" size="icon"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <Timeline decision={decision} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className={cx("text-slate-700", highlight && "font-semibold text-slate-900")}>{value && value.trim() ? value : <span className="text-slate-400">—</span>}</div>
    </div>
  );
}
function Mini({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
function AIField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-violet-500 mb-1">{label}</div>
      <div className="text-slate-700">{value || <span className="text-slate-400">—</span>}</div>
    </div>
  );
}