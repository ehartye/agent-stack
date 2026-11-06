// The fact sets. Every fact carries a value, a note and the sources it came from, because
// vendor pages disagree and "not stated" must never be read as "no".

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'agent-stack/facts@1';
export const VALUES = ['yes', 'no', 'conditional', 'unstated', 'conflict'];
export const QUOTA_KINDS = ['burndown', 'separate', 'uncached-input', 'tiered', 'opaque'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dataDir = join(root, 'data');

export function loadSets(dir = dataDir) {
  const sets = new Map();
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    sets.set(name.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, name), 'utf8')));
  }
  return sets;
}

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isLimit = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Returns a list of problems; an empty list means the set is usable.
export function validateSet(set, name = 'set') {
  const problems = [];
  const bad = (where, message) => problems.push(`${name}: ${where}: ${message}`);
  if (set.schema !== SCHEMA) bad('schema', `must be ${SCHEMA}`);
  if (!isDate(set.as_of)) bad('as_of', 'must be YYYY-MM-DD');
  if (typeof set.title !== 'string' || !set.title) bad('title', 'is required');

  const sources = set.sources ?? {};
  for (const [id, source] of Object.entries(sources)) {
    if (!/^https:\/\//.test(source.url ?? '')) bad(`sources.${id}.url`, 'must be an https URL');
    if (!source.title) bad(`sources.${id}.title`, 'is required');
    if (!['vendor', 'standard', 'research', 'independent'].includes(source.kind)) bad(`sources.${id}.kind`, 'must be vendor, standard, research or independent');
  }
  const facts = set.fact_definitions ?? {};
  if (Object.keys(facts).length === 0) bad('fact_definitions', 'must define the facts this set records');

  const seen = new Set();
  const usedSources = new Set();
  if (!Array.isArray(set.options) || set.options.length === 0) bad('options', 'must be a non-empty list');
  for (const option of set.options ?? []) {
    const where = option.id ?? '(no id)';
    if (!/^[a-z0-9][a-z0-9.@_-]*$/.test(option.id ?? '')) bad(where, 'id must be lowercase with no spaces');
    if (seen.has(option.id)) bad(where, 'duplicate id');
    seen.add(option.id);
    if (!option.name) bad(where, 'name is required');
    for (const [key, fact] of Object.entries(option.facts ?? {})) {
      if (!(key in facts)) bad(`${where}.${key}`, 'is not in fact_definitions');
      if (!VALUES.includes(fact.value)) bad(`${where}.${key}`, `value must be one of ${VALUES.join(', ')}`);
      if (!Array.isArray(fact.sources) || fact.sources.length === 0) bad(`${where}.${key}`, 'needs at least one source, including the page checked when a value is unstated');
      for (const id of fact.sources ?? []) {
        usedSources.add(id);
        if (!(id in sources)) bad(`${where}.${key}`, `unknown source ${id}`);
      }
      if (['conditional', 'conflict', 'unstated'].includes(fact.value) && !fact.note) bad(`${where}.${key}`, `${fact.value} needs a note saying why`);
      if (fact.quantity !== undefined && (!isCount(fact.quantity.value) || typeof fact.quantity.unit !== 'string')) bad(`${where}.${key}`, 'quantity needs a positive value and a unit');
    }
    if (option.quota) problems.push(...validateQuota(option.quota, sources, usedSources).map((m) => `${name}: ${where}.quota: ${m}`));
  }
  for (const id of Object.keys(sources)) if (!usedSources.has(id)) bad(`sources.${id}`, 'is not cited by any fact');
  return problems;
}

function validateQuota(quota, sources, used) {
  const problems = [];
  if (!QUOTA_KINDS.includes(quota.kind)) problems.push(`kind must be one of ${QUOTA_KINDS.join(', ')}`);
  for (const id of quota.sources ?? []) {
    used.add(id);
    if (!(id in sources)) problems.push(`unknown source ${id}`);
  }
  if (!Array.isArray(quota.sources) || quota.sources.length === 0) problems.push('needs a source');
  if (quota.kind === 'burndown') {
    if (!isCount(quota.tpm)) problems.push('tpm is required');
    if (quota.output_multiplier !== null && !isCount(quota.output_multiplier)) problems.push('output_multiplier must be a number, or null when the vendor does not state it');
  }
  if (quota.kind === 'separate' && (!isCount(quota.input_tpm) || !isCount(quota.output_tpm))) problems.push('input_tpm and output_tpm are required');
  if (quota.kind === 'uncached-input' && (!isLimit(quota.itpm) || !isLimit(quota.otpm))) problems.push('itpm and otpm are required');
  if (quota.kind === 'tiered') {
    if (!Array.isArray(quota.tiers) || quota.tiers.length === 0) problems.push('tiers are required');
    if (quota.counting !== undefined && quota.counting !== 'uncached-input') problems.push('counting, when present, must be uncached-input');
    for (const tier of quota.tiers ?? []) {
      const tokens = quota.counting === 'uncached-input' ? isLimit(tier.itpm) && isLimit(tier.otpm) : isCount(tier.tpm);
      if (!tier.name || !tokens || !isLimit(tier.rpm)) problems.push('each tier needs a name, a request limit and its token limits');
    }
  }
  if (quota.kind === 'opaque' && !quota.note) problems.push('opaque needs a note saying where the number lives');
  return problems;
}
