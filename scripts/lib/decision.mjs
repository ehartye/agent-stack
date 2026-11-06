// A decision record: hard constraints first, then ranked options, then evidence with dates.

export const DIMENSIONS = ['time', 'risk', 'complexity', 'best_practice', 'maintainability'];
const STALE_DAYS = 90;
const DAY = 86_400_000;

export function checkDecision(doc, { today } = {}) {
  const findings = [];
  const add = (level, code, message) => findings.push({ level, code, message });
  const now = today ? Date.parse(today) : Date.now();

  if (!doc.question) add('error', 'NO_QUESTION', 'state the question being decided');
  if (!Array.isArray(doc.constraints) || !doc.constraints.some((c) => c.hard)) {
    add('warning', 'NO_HARD_CONSTRAINT', 'no hard constraint is recorded; a selection with none is a preference, so say so');
  }
  const options = Array.isArray(doc.options) ? doc.options : [];
  if (options.length < 2) add('error', 'TOO_FEW_OPTIONS', 'compare at least two options');
  const names = options.map((o) => o.name);
  if (new Set(names).size !== names.length) add('error', 'DUPLICATE_OPTION', 'option names must be unique');

  const eliminated = new Set(options.filter((o) => o.eliminated_by).map((o) => o.name));
  const ranked = options.filter((o) => !o.eliminated_by);
  for (const dim of DIMENSIONS) {
    const ranks = ranked.map((o) => o.ranks?.[dim]);
    if (ranks.some((r) => !Number.isInteger(r) || r < 1 || r > ranked.length)) {
      add('error', 'BAD_RANK', `every surviving option needs a ${dim} rank from 1 to ${ranked.length}`);
    }
  }
  for (const option of ranked) {
    if (!option.why && doc.chosen !== option.name) add('error', 'NO_REASON', `say why "${option.name}" was not chosen`);
  }
  if (!doc.chosen) add('error', 'NOT_CHOSEN', 'name the chosen option');
  else if (!names.includes(doc.chosen)) add('error', 'CHOSEN_UNKNOWN', `"${doc.chosen}" is not among the options`);
  else if (eliminated.has(doc.chosen)) add('error', 'CHOSEN_ELIMINATED', `"${doc.chosen}" fails a hard constraint`);

  const evidence = Array.isArray(doc.evidence) ? doc.evidence : [];
  if (evidence.length === 0) add('error', 'NO_EVIDENCE', 'cite a source and date for the facts that decided this');
  for (const item of evidence) {
    if (!item.claim || !item.source || !item.as_of) {
      add('error', 'BAD_EVIDENCE', 'each evidence item needs a claim, a source and an as_of date');
      continue;
    }
    const age = Math.floor((now - Date.parse(item.as_of)) / DAY);
    if (age > STALE_DAYS) add('warning', 'STALE_EVIDENCE', `"${item.claim}" is ${age} days old; re-check ${item.source}`);
    if (item.kind === 'third-party') add('warning', 'THIRD_PARTY_FACT', `"${item.claim}" rests on a third party; prefer the operator's page`);
  }
  if (!Array.isArray(doc.verify_before_relying) || doc.verify_before_relying.length === 0) {
    add('warning', 'NOTHING_TO_VERIFY', 'list what must be confirmed in the customer account before relying on this');
  }
  return findings;
}

// The decision shape an engagement file uses, so a selection can be pasted into one.
export function toEngagementDecision(doc, id = 'X1') {
  return {
    id,
    question: doc.question,
    chosen: doc.chosen,
    rationale: doc.rationale ?? '',
    status: 'proposed',
    reversible: Boolean(doc.reversible),
    alternatives: (doc.options ?? [])
      .filter((o) => o.name !== doc.chosen)
      .map((o) => ({ option: o.name, why_not: o.eliminated_by ? `Fails: ${o.eliminated_by}` : o.why ?? '' })),
    evidence: (doc.evidence ?? []).map(({ claim, source, as_of }) => ({ claim, source, as_of })),
  };
}
