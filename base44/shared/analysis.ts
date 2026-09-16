// Shared decision-analysis helpers used by both AI backend functions.

// Parse a metric value to a number when possible (handles "3", "3.5", "$500", "10%", "8 days").
export function parseMetricValue(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Match expected metrics to actual metrics by name (case-insensitive trim).
export function matchMetrics(expectedMetrics, actualMetrics) {
  const actual = Array.isArray(actualMetrics) ? actualMetrics : [];
  return (expectedMetrics || []).map((e) => {
    const nameKey = String(e.metric_name || "").trim().toLowerCase();
    const a = actual.find(
      (x) => String(x.metric_name || "").trim().toLowerCase() === nameKey
    );
    const exp = parseMetricValue(e.expected_value);
    const act = a ? parseMetricValue(a.actual_value) : null;
    let pctDiff = null;
    let direction = null;
    if (exp !== null && act !== null && exp !== 0) {
      pctDiff = ((act - exp) / Math.abs(exp)) * 100;
      direction = act > exp ? "over" : act < exp ? "under" : "equal";
    }
    return {
      metric_name: e.metric_name,
      expected_value: e.expected_value,
      actual_value: a ? a.actual_value : null,
      unit: e.unit || (a ? a.unit : ""),
      expected_num: exp,
      actual_num: act,
      pct_diff: pctDiff,
      direction
    };
  });
}

export function summarizeReviewedDecisions(decisions) {
  const reviewed = (decisions || []).filter((d) => d.status === "reviewed" && d.outcome);
  const total = reviewed.length;
  const metricComparisons = [];
  const byCategory = {};
  const confidenceBuckets = { high: { total: 0, success: 0 }, other: { total: 0, success: 0 } };
  const assumptionResults = {};

  for (const d of reviewed) {
    const matches = matchMetrics(d.expected_metrics, d.outcome.actual_metrics);
    for (const m of matches) {
      if (m.pct_diff !== null) metricComparisons.push({ ...m, decision_title: d.title, category: d.category });
    }
    const cat = d.category || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, success: 0, diffs: [] };
    byCategory[cat].total += 1;
    if (d.outcome.result === "as_expected" || d.outcome.result === "better") byCategory[cat].success += 1;
    for (const m of matches) if (m.pct_diff !== null) byCategory[cat].diffs.push(m.pct_diff);

    const conf = typeof d.confidence === "number" ? d.confidence : 0;
    const bucket = conf >= 90 ? "high" : "other";
    confidenceBuckets[bucket].total += 1;
    if (d.outcome.result === "as_expected" || d.outcome.result === "better") confidenceBuckets[bucket].success += 1;

    for (const a of d.assumptions || []) {
      if (!a.text) continue;
      const key = a.text.trim().toLowerCase();
      if (!assumptionResults[key]) assumptionResults[key] = { text: a.text, correct: 0, partially: 0, incorrect: 0, unknown: 0, total: 0 };
      assumptionResults[key].total += 1;
      const r = a.result || "unknown";
      if (r === "correct") assumptionResults[key].correct += 1;
      else if (r === "partially_correct") assumptionResults[key].partially += 1;
      else if (r === "incorrect") assumptionResults[key].incorrect += 1;
      else assumptionResults[key].unknown += 1;
    }
  }

  return { total, metricComparisons, byCategory, confidenceBuckets, assumptionResults };
}