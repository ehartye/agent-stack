// Hard-constraint elimination. "Not stated" and "vendors disagree" stay visible as things to
// verify; neither is treated as a pass or as a failure.

export function parseWhere(pairs = []) {
  return pairs.map((pair) => {
    const at = pair.indexOf('=');
    if (at < 1) throw new Error(`--where expects field=value, got "${pair}"`);
    return [pair.slice(0, at), pair.slice(at + 1)];
  });
}

export function parseMin(pairs = []) {
  return pairs.map((pair) => {
    const at = pair.indexOf('=');
    const need = Number(pair.slice(at + 1));
    if (at < 1 || !Number.isFinite(need)) throw new Error(`--min expects fact=number, got "${pair}"`);
    return [pair.slice(0, at), need];
  });
}

export function gate(set, { require = [], where = [], min = [] } = {}) {
  const defs = set.fact_definitions ?? {};
  for (const key of [...require, ...min.map(([k]) => k)]) {
    if (!(key in defs)) throw new Error(`unknown fact "${key}". This set records: ${Object.keys(defs).join(', ')}`);
  }
  const options = (set.options ?? []).filter((o) => where.every(([k, v]) => String(o[k]) === v));
  const results = options.map((option) => {
    const verdicts = require.map((key) => {
      const fact = option.facts?.[key];
      if (!fact) return { key, value: 'unstated', note: 'This set has no entry for this option; check the vendor page.', sources: [] };
      return { key, ...fact };
    });
    // A threshold is judged on the stated quantity. Without one, a "yes" says nothing about size.
    for (const [key, need] of min) {
      const fact = option.facts?.[key];
      const quantity = fact?.quantity;
      if (!quantity) {
        verdicts.push({ key, value: 'unstated', note: `No stated quantity to compare with ${need}. ${fact?.note ?? ''}`.trim(), sources: fact?.sources ?? [] });
      } else if (quantity.value < need) {
        verdicts.push({ key, ...fact, value: 'no', note: `Stated limit ${quantity.value} ${quantity.unit} is below the required ${need}. ${fact.note ?? ''}`.trim() });
      } else {
        verdicts.push({ key, ...fact });
      }
    }
    let status = require.length + min.length === 0 ? 'listed' : 'pass';
    if (verdicts.some((v) => v.value === 'no')) status = 'eliminated';
    else if (verdicts.some((v) => v.value === 'unstated' || v.value === 'conflict')) status = 'verify';
    else if (verdicts.some((v) => v.value === 'conditional')) status = 'conditional';
    return { id: option.id, name: option.name, status, verdicts };
  });
  const order = { pass: 0, listed: 0, conditional: 1, verify: 2, eliminated: 3 };
  results.sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id));
  return { as_of: set.as_of, require, results };
}

export function formatGate(report, set) {
  const lines = [`Facts as of ${report.as_of}. Required: ${report.require.join(', ') || 'nothing, so this only lists options and passes none of them'}.`];
  if (report.results.length === 0) lines.push('No option matches the filter.');
  for (const r of report.results) {
    lines.push(`${r.status.toUpperCase().padEnd(11)} ${r.id}  (${r.name})`);
    for (const v of r.verdicts) {
      if (v.value === 'yes') continue;
      const cites = (v.sources ?? []).map((id) => set.sources?.[id]?.url).filter(Boolean).join(' ');
      lines.push(`            ${v.key}: ${v.value}. ${v.note ?? ''}${cites ? ` [${cites}]` : ''}`);
    }
  }
  return lines.join('\n');
}
