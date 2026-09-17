// Helpers for importing historical decisions (manual + CSV/JSON).
// A single normalization path is shared by the manual form and file import.

export const IMPORT_COLUMNS = [
  "title", "decision_date", "context", "options", "selected_option", "reasoning",
  "assumptions", "assumption_results", "expected_outcome", "expected_metrics",
  "confidence", "category", "project", "actual_outcome", "actual_metrics",
  "review_date", "cause", "result", "parent_decision_title", "related_decision_titles"
];

export const CSV_TEMPLATE = IMPORT_COLUMNS.join(",") + "\n";

function splitLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur); cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

export function parseCsv(text) {
  const lines = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(cur); cur = "";
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  if (!lines.length) return [];
  const header = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitLine(lines[i]);
    const obj = {};
    header.forEach((h, j) => { obj[h.trim()] = cells[j] !== undefined ? cells[j] : ""; });
    rows.push(obj);
  }
  return rows;
}

function splitSemi(s) {
  return (s || "").split(";").map((x) => x.trim()).filter(Boolean);
}

function parseJsonList(s) {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Convert a flat row (CSV) or a nested object (JSON) into a Decision entity payload.
export function normalizeImportRow(row, existingDecisions = []) {
  const byTitle = {};
  for (const d of existingDecisions) {
    const k = (d.title || "").trim().toLowerCase();
    if (k) byTitle[k] = d.id;
  }

  const outcomeObj = row.outcome && typeof row.outcome === "object" ? row.outcome : null;
  const actualOutcome = row.actual_outcome ?? (outcomeObj && outcomeObj.actual_outcome) ?? "";
  const actualMetricsRaw = row.actual_metrics ?? (outcomeObj && outcomeObj.actual_metrics) ?? [];
  const cause = row.cause ?? (outcomeObj && outcomeObj.explanation) ?? "";
  const result = row.result ?? (outcomeObj && outcomeObj.result) ?? "";

  const expectedMetrics = Array.isArray(row.expected_metrics) ? row.expected_metrics : parseJsonList(row.expected_metrics);
  const actualMetrics = Array.isArray(actualMetricsRaw) ? actualMetricsRaw : parseJsonList(actualMetricsRaw);

  const assumptionTexts = Array.isArray(row.assumptions) ? row.assumptions : splitSemi(row.assumptions);
  const assumptionResults = Array.isArray(row.assumption_results) ? row.assumption_results : splitSemi(row.assumption_results);
  const assumptions = assumptionTexts.map((t, i) => ({
    text: typeof t === "string" ? t : t.text,
    result: assumptionResults[i] || "unknown"
  })).filter((a) => a.text);

  const optionsArr = Array.isArray(row.options)
    ? row.options.map((o) => (typeof o === "string" ? { name: o } : o))
    : splitSemi(row.options).map((n) => ({ name: n }));

  const confRaw = row.confidence;
  const confidence = confRaw === "" || confRaw === null || confRaw === undefined || confRaw === "unknown"
    ? undefined
    : Number(confRaw);

  const parentTitle = row.parent_decision_title || row.parent_decision || "";
  const parentId = parentTitle ? byTitle[parentTitle.trim().toLowerCase()] : undefined;
  const relatedTitles = Array.isArray(row.related_decision_titles) ? row.related_decision_titles : splitSemi(row.related_decision_titles);
  const relatedIds = relatedTitles.map((t) => byTitle[String(t).trim().toLowerCase()]).filter(Boolean);

  const hasOutcome = actualOutcome || actualMetrics.length || result || cause;
  const outcome = hasOutcome ? {
    actual_outcome: actualOutcome || undefined,
    actual_metrics: actualMetrics.length ? actualMetrics : undefined,
    result: result || undefined,
    explanation: cause || undefined,
    reviewed_at: new Date().toISOString()
  } : undefined;

  const decision = {
    title: (row.title || "").trim(),
    decision_date: row.decision_date || undefined,
    context: row.context || undefined,
    options: optionsArr.length ? optionsArr : undefined,
    selected_option: row.selected_option || undefined,
    reasoning: row.reasoning || undefined,
    assumptions: assumptions.length ? assumptions : undefined,
    expected_outcome: row.expected_outcome || undefined,
    expected_metrics: expectedMetrics.length ? expectedMetrics : undefined,
    confidence: typeof confidence === "number" && !Number.isNaN(confidence) ? confidence : undefined,
    category: row.category || undefined,
    project: row.project || undefined,
    review_date: row.review_date || undefined,
    is_historical: true,
    parent_decision_id: parentId,
    related_decision_ids: relatedIds.length ? relatedIds : undefined,
    status: hasOutcome ? "reviewed" : "active",
    outcome
  };

  Object.keys(decision).forEach((k) => decision[k] === undefined && delete decision[k]);
  return decision;
}

// Map a form object to a flat row, then normalize (shared path).
export function formToDecision(form, existingDecisions = []) {
  const idToTitle = {};
  for (const d of existingDecisions) idToTitle[d.id] = d.title;

  const row = {
    title: form.title,
    decision_date: form.decision_date || undefined,
    context: form.context || undefined,
    category: form.category || undefined,
    project: form.project || undefined,
    options: (form.options || []).map((o) => o.trim()).filter(Boolean).join("; "),
    selected_option: form.selected_option || undefined,
    reasoning: form.reasoning || undefined,
    assumptions: (form.assumptions || []).map((a) => a.text.trim()).filter(Boolean).join("; "),
    assumption_results: (form.assumptions || []).map((a) => a.result).join("; "),
    expected_outcome: form.expected_outcome || undefined,
    expected_metrics: JSON.stringify((form.expected_metrics || []).filter((m) => m.metric_name.trim())),
    confidence: form.confidence === "" ? undefined : form.confidence,
    actual_outcome: form.actual_outcome || undefined,
    actual_metrics: JSON.stringify((form.actual_metrics || []).filter((m) => m.metric_name.trim())),
    review_date: form.review_date || undefined,
    cause: form.cause || undefined,
    result: form.result || undefined,
    parent_decision_title: form.parent_decision_id ? idToTitle[form.parent_decision_id] : "",
    related_decision_titles: (form.related_decision_ids || []).map((id) => idToTitle[id]).filter(Boolean).join("; ")
  };
  return normalizeImportRow(row, existingDecisions);
}

export function blankForm() {
  return {
    title: "", decision_date: "", context: "", category: "", project: "",
    options: [""], selected_option: "", reasoning: "",
    assumptions: [{ text: "", result: "unknown" }],
    expected_outcome: "",
    expected_metrics: [{ metric_name: "", expected_value: "", unit: "" }],
    confidence: "",
    actual_outcome: "",
    actual_metrics: [{ metric_name: "", actual_value: "", unit: "" }],
    review_date: "", cause: "", result: "",
    parent_decision_id: "", related_decision_ids: []
  };
}