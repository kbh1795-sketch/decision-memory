import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { matchMetrics } from '../../shared/analysis.ts';

function evidenceStrength(count) {
  if (count >= 5) return 'strong';
  if (count >= 3) return 'emerging';
  return 'weak';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const decisions = await base44.asServiceRole.entities.Decision.list('-created_date', 500);
    if (!decisions.length) {
      return Response.json({ error: 'No decisions found. Import historical decisions first.' }, { status: 400 });
    }

    const withOutcome = decisions.filter((d) => d.outcome && (d.outcome.actual_outcome || (d.outcome.actual_metrics && d.outcome.actual_metrics.length) || d.outcome.result));
    if (withOutcome.length < 1) {
      return Response.json({ error: 'No decisions with recorded outcomes. Import actual outcomes before analysing.' }, { status: 400 });
    }

    // Build compact digests for every decision (so parent/chain lookups work).
    const digests = decisions.map((d, i) => {
      const matches = matchMetrics(d.expected_metrics, d.outcome && d.outcome.actual_metrics);
      const metricLine = matches.map((m) =>
        `${m.metric_name}: exp ${m.expected_value ?? '—'} / act ${m.actual_value ?? '—'}${m.pct_diff !== null ? ` (${m.pct_diff > 0 ? '+' : ''}${m.pct_diff.toFixed(0)}%)` : ''}`
      ).join('; ');
      const assumptions = (d.assumptions || []).map((a) => `"${a.text}" -> ${a.result || 'unknown'}`).join('; ');
      const parent = d.parent_decision_id ? decisions.find((x) => x.id === d.parent_decision_id) : null;
      const related = (d.related_decision_ids || []).map((rid) => decisions.find((x) => x.id === rid)).filter(Boolean).map((x) => x.title);
      return {
        ref: `D${i + 1}`,
        id: d.id,
        title: d.title,
        category: d.category || 'uncategorized',
        project: d.project || '',
        decision_date: d.decision_date || '',
        review_date: d.review_date || '',
        confidence: typeof d.confidence === 'number' ? `${d.confidence}%` : 'unknown',
        expected_outcome: d.expected_outcome || '',
        actual_outcome: (d.outcome && d.outcome.actual_outcome) || '',
        result: (d.outcome && d.outcome.result) || '',
        cause: (d.outcome && d.outcome.explanation) || '',
        reasoning: d.reasoning || '',
        selected_option: d.selected_option || '',
        options: (d.options || []).map((o) => o.name).join(' | '),
        assumptions,
        metrics: metricLine,
        parent: parent ? parent.title : '',
        related: related.join(' | ')
      };
    });

    const digestLines = digests.map((d) =>
      `${d.ref} | "${d.title}" | cat=${d.category} | project=${d.project || '—'} | decided=${d.decision_date || '—'} | reviewed=${d.review_date || '—'} | confidence=${d.confidence}
   expected: ${d.expected_outcome || '—'}
   actual: ${d.actual_outcome || '—'}
   result: ${d.result || '—'}
   cause: ${d.cause || '—'}
   selected: ${d.selected_option || '—'} | options: ${d.options || '—'}
   assumptions: ${d.assumptions || '—'}
   metrics: ${d.metrics || '—'}
   parent: ${d.parent || '—'} | related: ${d.related || '—'}`
    ).join('\n');

    const prompt = `You are a rigorous decision-pattern analyst examining a person's REAL retrospective decision records. Cite ONLY decisions that appear below, by their D-ref (e.g. D3). Never fabricate decisions, numbers, or confidence values. If a confidence was recorded as "unknown", never invent a number. Do not give motivational or psychological advice. Analyse observable decision behaviour only. Every finding must cite at least one D-ref. Write ALL output (titles, descriptions, area, reason) in Korean (한국어).

DECISION RECORDS:
${digestLines}

Produce findings across these 8 dimensions (only where evidence supports them). Each finding cites the D-refs that support it.
1. prediction_accuracy — compare what was expected with what actually happened.
2. repeated_incorrect_assumptions — assumptions that repeatedly caused decisions to fail or require revision.
3. decision_reversals — cases where direction changed after discovering new information (initial idea -> limitation -> alternative). Use parent/related links and sequencing to detect chains.
4. estimation_bias — systematic over/under-estimation of time, cost, difficulty, expected performance, or expected opportunity. Only where quantitative metrics exist.
5. research_before_decision — whether decisions made before sufficient verification get revised more often than those based on prior investigation.
6. tool_selection — whether tools are chosen before verifying capability, technical constraints underestimated, tools switched after implementation starts, or unsuitable approaches abandoned early.
7. persistence_vs_switching — when continuing with an initial decision worked and when changing direction produced a better result. Do not label switching itself as good or bad; judge by outcome.
8. category_patterns — compare decision quality across categories (e.g. Research, Software development, Tools, Project selection, Publication, Competitions, Technical architecture).

Also produce a personal decision profile with findings under these sections (only where evidence supports them):
- estimates_well
- systematically_underestimate
- systematically_overestimate
- common_direction_changes
- frequent_failed_assumptions
- better_than_expected
- worse_than_expected
- insufficient_evidence

Return JSON with:
- dimensions: array of { dimension, title, description, evidence (array of D-refs) }
- profile: array of { section, title, description, evidence (array of D-refs) }
- insufficient: array of { area, reason }

Rules: evidence arrays must contain only D-refs that exist in the records. Be specific and quantitative in descriptions. No generic personality statements. If a dimension or section has insufficient evidence, either omit it or list it under insufficient.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                evidence: { type: 'array', items: { type: 'string' } }
              },
              required: ['dimension', 'title', 'description', 'evidence']
            }
          },
          profile: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                evidence: { type: 'array', items: { type: 'string' } }
              },
              required: ['section', 'title', 'description', 'evidence']
            }
          },
          insufficient: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['area', 'reason']
            }
          }
        },
        required: ['dimensions', 'profile', 'insufficient']
      }
    });

    const refMap = {};
    for (const d of digests) refMap[d.ref] = { id: d.id, title: d.title };

    const mapEvidence = (refs) => (refs || [])
      .map((r) => refMap[r] || (r && r.startsWith('D') ? null : { title: r }))
      .filter(Boolean);

    const now = new Date().toISOString();
    const records = [];

    for (const f of (llm.dimensions || [])) {
      const ev = mapEvidence(f.evidence);
      records.push({
        type: 'dimension',
        dimension: f.dimension,
        title: f.title,
        description: f.description,
        evidence: ev,
        evidence_count: ev.length,
        strength: evidenceStrength(ev.length),
        generated_at: now
      });
    }
    for (const f of (llm.profile || [])) {
      const ev = mapEvidence(f.evidence);
      records.push({
        type: 'profile',
        section: f.section,
        title: f.title,
        description: f.description,
        evidence: ev,
        evidence_count: ev.length,
        strength: evidenceStrength(ev.length),
        generated_at: now
      });
    }
    for (const f of (llm.insufficient || [])) {
      records.push({
        type: 'insufficient',
        area: f.area,
        reason: f.reason,
        title: f.area,
        description: f.reason,
        evidence: [],
        evidence_count: 0,
        strength: 'weak',
        generated_at: now
      });
    }

    await base44.asServiceRole.entities.HistoryReport.deleteMany({});
    if (records.length) {
      await base44.asServiceRole.entities.HistoryReport.bulkCreate(records);
    }

    return Response.json({ report: records, decision_count: decisions.length, with_outcome_count: withOutcome.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}