import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { matchMetrics } from '../../shared/analysis.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const decisionId = body?.decision_id;
    if (!decisionId) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const decision = await base44.asServiceRole.entities.Decision.get(decisionId);
    if (!decision) return Response.json({ error: 'Decision not found' }, { status: 404 });
    if (!decision.outcome) return Response.json({ error: 'Outcome has not been recorded yet' }, { status: 400 });

    const matches = matchMetrics(decision.expected_metrics, decision.outcome.actual_metrics);
    const metricLines = matches.map((m) => {
      if (m.pct_diff === null) return `- ${m.metric_name}: expected ${m.expected_value}${m.unit ? ' ' + m.unit : ''}, actual ${m.actual_value ?? '—'}${m.unit ? ' ' + m.unit : ''}.`;
      const sign = m.pct_diff > 0 ? '+' : '';
      return `- ${m.metric_name}: expected ${m.expected_value}${m.unit ? ' ' + m.unit : ''}, actual ${m.actual_value}${m.unit ? ' ' + m.unit : ''} (${sign}${m.pct_diff.toFixed(0)}% ${m.direction === 'over' ? 'higher' : m.direction === 'under' ? 'lower' : 'equal'}).`;
    }).join('\n');

    const assumptionLines = (decision.assumptions || [])
      .map((a, i) => `${i + 1}. "${a.text}" — judged: ${a.result || 'unknown'}`)
      .join('\n');

    const prompt = `You are an analyst reviewing a single decision against its actual outcome. Be concise, specific and quantitative. Do NOT give generic motivational advice. Do NOT rewrite the user's text.

DECISION TITLE: ${decision.title}
CONTEXT: ${decision.context || '(none)'}
SELECTED OPTION: ${decision.selected_option || '(none)'}
REASONING: ${decision.reasoning || '(none)'}

EXPECTED METRICS vs ACTUAL:
${metricLines || '(no metrics recorded)'}

ASSUMPTIONS AND THEIR VERDICT:
${assumptionLines || '(none)'}

ACTUAL OUTCOME (user summary): ${decision.outcome.actual_outcome || '(none)'}
USER'S EXPLANATION OF DIFFERENCE: ${decision.outcome.explanation || '(none)'}
USER'S RESULT RATING: ${decision.outcome.result}

Produce a structured review with these exact fields:
- what_happened: one or two sentences stating what actually happened, with the key numbers.
- largest_error: the single largest forecasting/estimation error, quantified as a percentage when possible.
- incorrect_assumption: the assumption that proved most wrong (or "partially correct"), quoted. If none, say so.
- predicted_correctly: what was predicted accurately.
- lesson: one sentence on the real forecasting error (not generic advice).`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          what_happened: { type: 'string' },
          largest_error: { type: 'string' },
          incorrect_assumption: { type: 'string' },
          predicted_correctly: { type: 'string' },
          lesson: { type: 'string' }
        },
        required: ['what_happened', 'largest_error', 'incorrect_assumption', 'predicted_correctly', 'lesson']
      }
    });

    const aiReview = {
      what_happened: llm.what_happened,
      largest_error: llm.largest_error,
      incorrect_assumption: llm.incorrect_assumption,
      predicted_correctly: llm.predicted_correctly,
      lesson: llm.lesson,
      generated_at: new Date().toISOString()
    };

    await base44.asServiceRole.entities.Decision.update(decisionId, { ai_review: aiReview });
    return Response.json({ ai_review: aiReview });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}