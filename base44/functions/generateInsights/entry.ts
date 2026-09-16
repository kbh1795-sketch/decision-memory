import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { summarizeReviewedDecisions, matchMetrics } from '../../shared/analysis.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const decisions = await base44.asServiceRole.entities.Decision.list('-created_date', 500);
    const reviewed = decisions.filter((d) => d.status === 'reviewed' && d.outcome);

    if (reviewed.length < 2) {
      return Response.json({ insights: [], message: 'Insufficient data — at least 2 reviewed decisions are needed to detect patterns.' });
    }

    const summary = summarizeReviewedDecisions(decisions);

    // Build quantitative context for the LLM.
    const metricLines = summary.metricComparisons.map((m) =>
      `- ${m.metric_name} (${m.decision_title}): expected ${m.expected_value}, actual ${m.actual_value}, ${m.pct_diff > 0 ? '+' : ''}${m.pct_diff.toFixed(0)}%`
    ).join('\n');

    const categoryLines = Object.entries(summary.byCategory).map(([cat, c]) => {
      const avg = c.diffs.length ? (c.diffs.reduce((a, b) => a + b, 0) / c.diffs.length).toFixed(0) : 'n/a';
      return `- ${cat}: ${c.total} decisions, ${c.success} on/better than expected, avg metric deviation ${avg}%`;
    }).join('\n');

    const confHigh = summary.confidenceBuckets.high;
    const confOther = summary.confidenceBuckets.other;
    const confLine = `- Decisions with >=90% confidence: ${confHigh.total} total, ${confHigh.success} succeeded (${confHigh.total ? Math.round(confHigh.success / confHigh.total * 100) : 0}%). Lower confidence: ${confOther.total} total, ${confOther.success} succeeded (${confOther.total ? Math.round(confOther.success / confOther.total * 100) : 0}%).`;

    const assumptionLines = Object.values(summary.assumptionResults)
      .filter((a) => a.total >= 2)
      .map((a) => `- "${a.text}": correct ${a.correct}, partially ${a.partially}, incorrect ${a.incorrect}, unknown ${a.unknown} (across ${a.total} decisions)`)
      .join('\n');

    const prompt = `You are a decision-pattern analyst. You are given structured data from ${reviewed.length} reviewed decisions. Identify ONLY patterns that are clearly supported by the data. Do NOT fabricate insights. If data is insufficient for a claim, omit it. Be quantitative and specific. Do NOT give motivational advice.

METRIC COMPARISONS (expected vs actual):
${metricLines || '(none)'}

BY CATEGORY:
${categoryLines || '(none)'}

CONFIDENCE CALIBRATION:
${confLine}

RECURRING ASSUMPTIONS (appeared 2+ times):
${assumptionLines || '(none)'}

Generate a JSON object with an array "patterns". Each pattern has:
- type: one of "estimation_bias", "confidence_calibration", "category_performance", "assumption_failure", "cost_bias", "decision_speed", "other"
- title: a short headline (one sentence)
- description: 1-2 sentences with the specific numbers/evidence
- evidence_count: integer number of decisions supporting this

Only include patterns with evidence_count >= 2. Maximum 6 patterns. If no pattern is well-supported, return an empty array.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                evidence_count: { type: 'number' }
              },
              required: ['type', 'title', 'description', 'evidence_count']
            }
          }
        },
        required: ['patterns']
      }
    });

    // Also compute a deterministic forecast-accuracy insight from metrics.
    const insights = [];
    const now = new Date().toISOString();

    if (summary.metricComparisons.length >= 2) {
      // group by metric name
      const byMetric = {};
      for (const m of summary.metricComparisons) {
        const k = m.metric_name.trim().toLowerCase();
        if (!byMetric[k]) byMetric[k] = { name: m.metric_name, diffs: [], count: 0 };
        byMetric[k].diffs.push(m.pct_diff);
        byMetric[k].count += 1;
      }
      for (const k of Object.keys(byMetric)) {
        const g = byMetric[k];
        if (g.count >= 2) {
          const avg = g.diffs.reduce((a, b) => a + b, 0) / g.diffs.length;
          insights.push({
            type: 'estimation_bias',
            title: `${g.name} estimates are ${avg > 0 ? 'under' : 'over'}estimated by an average of ${Math.abs(avg).toFixed(0)}%`,
            description: `Across ${g.count} reviewed decisions, actual ${g.name.toLowerCase()} averaged ${avg > 0 ? '+' : ''}${avg.toFixed(0)}% versus expectations.`,
            evidence_count: g.count,
            data: { metric: g.name, avg_pct_diff: avg, count: g.count },
            generated_at: now
          });
        }
      }
    }

    for (const p of (llm.patterns || [])) {
      insights.push({
        type: p.type,
        title: p.title,
        description: p.description,
        evidence_count: p.evidence_count,
        data: {},
        generated_at: now
      });
    }

    // Replace existing insights.
    await base44.asServiceRole.entities.Insight.deleteMany({});
    if (insights.length) {
      await base44.asServiceRole.entities.Insight.bulkCreate(insights);
    }

    return Response.json({ insights, reviewed_count: reviewed.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}