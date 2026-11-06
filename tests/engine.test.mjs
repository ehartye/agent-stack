import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { capacity, workload } from '../scripts/lib/capacity.mjs';
import { validateSet } from '../scripts/lib/data.mjs';
import { checkDecision, toEngagementDecision } from '../scripts/lib/decision.mjs';
import { gate, parseMin, parseWhere } from '../scripts/lib/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'scripts', 'stack.mjs');
const temp = mkdtempSync(join(tmpdir(), 'agent-stack-'));
after(() => rmSync(temp, { recursive: true, force: true }));

const source = { S1: { title: 'Doc', url: 'https://example.com/doc', kind: 'vendor' } };
const fact = (value, note) => ({ value, sources: ['S1'], ...(note ? { note } : {}) });
const fixture = () => ({
  schema: 'agent-stack/facts@1',
  title: 'Fixture',
  as_of: '2026-11-06',
  sources: structuredClone(source),
  fact_definitions: { zdr: 'Zero data retention', batch: 'Batch API' },
  options: [
    { id: 'a', name: 'A', cloud: 'aws', facts: { zdr: fact('yes'), batch: fact('yes') } },
    { id: 'b', name: 'B', cloud: 'aws', facts: { zdr: fact('no'), batch: fact('yes') } },
    { id: 'c', name: 'C', cloud: 'azure', facts: { zdr: fact('unstated', 'The page is silent.'), batch: fact('yes') } },
    { id: 'd', name: 'D', cloud: 'gcp', facts: { zdr: fact('conditional', 'By request.'), batch: fact('conflict', 'Pages disagree.') } },
    { id: 'e', name: 'E', cloud: 'gcp', facts: { zdr: fact('conditional', 'By request.'), batch: fact('yes') } },
  ],
});

test('a fixture set validates', () => assert.deepEqual(validateSet(fixture()), []));

test('validation rejects an unsourced fact, an unknown fact, a bad value and an unexplained unstated', () => {
  const set = fixture();
  set.options[0].facts.zdr = { value: 'yes', sources: [] };
  set.options[0].facts.nope = fact('yes');
  set.options[1].facts.zdr = fact('maybe');
  set.options[2].facts.zdr = fact('unstated');
  const problems = validateSet(set).join('\n');
  assert.match(problems, /a\.zdr: needs at least one source/);
  assert.match(problems, /a\.nope: is not in fact_definitions/);
  assert.match(problems, /b\.zdr: value must be one of/);
  assert.match(problems, /c\.zdr: unstated needs a note/);
});

test('validation rejects an uncited source, a non-https source and a duplicate id', () => {
  const set = fixture();
  set.sources.S2 = { title: 'Unused', url: 'http://example.com', kind: 'vendor' };
  set.options[1].id = 'a';
  const problems = validateSet(set).join('\n');
  assert.match(problems, /sources\.S2\.url: must be an https URL/);
  assert.match(problems, /sources\.S2: is not cited/);
  assert.match(problems, /a: duplicate id/);
});

test('gate: no eliminates, unstated and conflict demand verification, conditional stays visible', () => {
  const byId = Object.fromEntries(gate(fixture(), { require: ['zdr', 'batch'] }).results.map((r) => [r.id, r.status]));
  assert.deepEqual(byId, { a: 'pass', b: 'eliminated', c: 'verify', d: 'verify', e: 'conditional' });
});

test('gate: results sort from pass to eliminated, and filters narrow by field', () => {
  const report = gate(fixture(), { require: ['zdr'] });
  assert.equal(report.results[0].id, 'a');
  assert.equal(report.results.at(-1).id, 'b');
  assert.deepEqual(gate(fixture(), { where: parseWhere(['cloud=azure']) }).results.map((r) => r.id), ['c']);
});

test('gate: a missing fact is unstated, never a pass', () => {
  const set = fixture();
  delete set.options[0].facts.batch;
  assert.equal(gate(set, { require: ['batch'] }).results.find((r) => r.id === 'a').status, 'verify');
});

test('gate: an unknown fact name is an error listing what exists', () => {
  assert.throws(() => gate(fixture(), { require: ['nope'] }), /This set records: zdr, batch/);
  assert.throws(() => parseWhere(['nonsense']), /field=value/);
});

test('gate: a threshold eliminates on a stated quantity below it, and a bare yes only earns a verify', () => {
  const set = fixture();
  set.fact_definitions.hours = 'Longest run in hours';
  set.options[0].facts.hours = { ...fact('yes'), quantity: { value: 8, unit: 'hours' } };
  set.options[1].facts.hours = { ...fact('yes'), quantity: { value: 100, unit: 'hours' } };
  set.options[2].facts.hours = fact('yes');
  const byId = Object.fromEntries(gate(set, { min: parseMin(['hours=72']) }).results.map((r) => [r.id, r]));
  assert.equal(byId.a.status, 'eliminated');
  assert.match(byId.a.verdicts[0].note, /8 hours is below the required 72/);
  assert.equal(byId.b.status, 'pass');
  assert.equal(byId.c.status, 'verify');
  assert.equal(byId.d.status, 'verify');
  assert.throws(() => parseMin(['hours']), /fact=number/);
  assert.deepEqual(validateSet(set), []);
});

test('gate: with nothing required, options are listed and not passed', () => {
  assert.ok(gate(fixture()).results.every((r) => r.status === 'listed'));
});

test('cli: help prints usage and the decision format is available', () => {
  for (const args of [['--help'], ['capacity', '--help'], ['-h']]) {
    const result = spawnSync('node', [cli, ...args]);
    assert.equal(result.status, 0);
    assert.match(result.stdout.toString(), /^usage:/);
  }
  assert.match(execFileSync('node', [cli, 'decision-format']).toString(), /verify_before_relying/);
  assert.match(execFileSync('node', [cli, 'facts', 'frontends']).toString(), /nextjs-ai-sdk/);
  assert.equal(spawnSync('node', [cli, 'facts', 'frontends', 'nope']).status, 2);
});

const baseline = { agents: 100, contextTokens: 150_000, turnSeconds: 30, outputPerTurn: 1800, maxTokens: 8000, cacheReadShare: 0.9, cacheWriteShare: 0.05 };
const option = (quota) => ({ id: 'x', name: 'X', quota: { sources: ['S1'], ...quota } });

test('capacity: burndown counts output at the multiplier, ignores cache reads and reserves max_tokens', () => {
  const report = capacity(option({ kind: 'burndown', tpm: 30_000_000, output_multiplier: 10 }), workload(baseline));
  const settled = report.limits.find((l) => l.name.includes('settled'));
  const reserved = report.limits.find((l) => l.name.includes('reserved'));
  assert.equal(settled.used, 200 * (7500 + 7500 + 18000));
  assert.equal(reserved.used, 200 * (7500 + 7500 + 8000));
  assert.equal(report.status, 'fits');
});

test('capacity: an oversized max_tokens binds before the settled figure does', () => {
  const report = capacity(option({ kind: 'burndown', tpm: 30_000_000, output_multiplier: 10 }), workload({ ...baseline, maxTokens: 128_000 }));
  assert.match(report.binding.name, /reserved/);
});

test('capacity: the daily row warns as an approximation and never sets the status', () => {
  const report = capacity(option({ kind: 'burndown', tpm: 30_000_000, output_multiplier: 10, account_tokens_per_day: 700_000_000 }), workload(baseline));
  assert.equal(report.status, 'fits');
  assert.match(report.binding.name, /per minute/);
  const row = report.limits.find((l) => l.name.includes('per day'));
  assert.ok(row.advisory && row.share > 1);
  assert.match(report.notes.join(' '), /question for the vendor/);
});

test('capacity: tiers can count uncached input with separate output limits, and a zero tier is over', () => {
  const quota = { kind: 'tiered', counting: 'uncached-input', tiers: [{ name: 'Trial', rpm: 0, itpm: 0, otpm: 0 }, { name: 'Pay-as-you-go', rpm: 40, itpm: 40_000, otpm: 8_000 }, { name: 'Enterprise', rpm: 10_000, itpm: 10_000_000, otpm: 2_000_000 }] };
  const trial = capacity(option(quota), workload(baseline));
  assert.equal(trial.status, 'over');
  assert.match(trial.notes.join(' '), /Lowest listed tier that fits: Enterprise/);
  const enterprise = capacity(option(quota), workload(baseline), { tier: 'Enterprise' });
  assert.equal(enterprise.status, 'fits');
  assert.equal(enterprise.limits[0].used, 200 * 15000);
  const set = fixture();
  set.options[0].quota = { ...quota, sources: ['S1'] };
  assert.deepEqual(validateSet(set), []);
});

test('capacity: an unstated multiplier gives unknown, not a guess, until one is assumed and labelled', () => {
  const quota = { kind: 'burndown', tpm: 6_000_000, output_multiplier: null };
  assert.equal(capacity(option(quota), workload(baseline)).status, 'unknown');
  const assumed = capacity(option(quota), workload(baseline), { assumeMultiplier: 10 });
  assert.notEqual(assumed.status, 'unknown');
  assert.match(assumed.notes.join(' '), /your assumption/);
});

test('capacity: separate input and output quotas do not multiply', () => {
  const report = capacity(option({ kind: 'separate', input_tpm: 20_000_000, output_tpm: 2_000_000 }), workload(baseline));
  assert.equal(report.limits.find((l) => l.name.startsWith('output')).used, 200 * 1800);
  assert.equal(report.limits.find((l) => l.name.startsWith('input')).used, 200 * 15000);
});

test('capacity: uncached-input excludes cache reads and can be over on requests', () => {
  const report = capacity(option({ kind: 'uncached-input', rpm: 40, itpm: 40_000, otpm: 8_000 }), workload(baseline));
  assert.equal(report.status, 'over');
  assert.equal(report.limits.find((l) => l.name.startsWith('input')).used, 200 * 15000);
});

test('capacity: tiered limits count the larger of max_tokens and the whole request, and name the lowest tier that fits', () => {
  const quota = { kind: 'tiered', tiers: [{ name: 'Small', rpm: 100, tpm: 1_000_000 }, { name: 'Big', rpm: 10_000, tpm: 40_000_000 }] };
  const low = capacity(option(quota), workload(baseline));
  assert.equal(low.status, 'over');
  assert.equal(low.limits[0].used, 200 * 150_000);
  assert.match(low.notes.join(' '), /Lowest listed tier that fits: Big/);
  assert.equal(capacity(option(quota), workload(baseline), { tier: 'Big' }).status, 'tight');
  assert.throws(() => capacity(option(quota), workload(baseline), { tier: 'Nope' }), /Tiers: Small, Big/);
  const huge = capacity(option(quota), workload({ ...baseline, contextTokens: 100, cacheReadShare: 0, cacheWriteShare: 0, maxTokens: 128_000 }), { tier: 'Big' });
  assert.equal(huge.limits[0].used, 200 * 128_000, 'an oversized max_tokens is what counts');
});

test('capacity: a zero quota is over, not unknown', () => {
  const report = capacity(option({ kind: 'uncached-input', rpm: 0, itpm: 0, otpm: 0 }), workload(baseline));
  assert.equal(report.status, 'over');
  assert.equal(report.binding.share, Number.POSITIVE_INFINITY);
});

test('capacity: an opaque quota says where the number lives', () => {
  const report = capacity(option({ kind: 'opaque', note: 'Read the console.' }), workload(baseline));
  assert.equal(report.status, 'unknown');
  assert.match(report.notes[0], /console/);
});

test('capacity: a route with no quota entry is unknown', () => {
  assert.equal(capacity({ id: 'x', name: 'X' }, workload(baseline)).status, 'unknown');
});

test('workload: impossible input is refused', () => {
  assert.throws(() => workload({ ...baseline, agents: 0 }), /agents/);
  assert.throws(() => workload({ ...baseline, cacheReadShare: 0.9, cacheWriteShare: 0.2 }), /sum to at most 1/);
  assert.throws(() => workload({ ...baseline, dutyCycle: 2 }), /duty cycle/);
});

const decision = () => ({
  question: 'Which model route?',
  constraints: [{ name: 'Zero data retention', hard: true }],
  options: [
    { name: 'A', ranks: { time: 1, risk: 1, complexity: 2, best_practice: 1, maintainability: 1 } },
    { name: 'B', why: 'Needs a second vendor.', ranks: { time: 2, risk: 2, complexity: 1, best_practice: 2, maintainability: 2 } },
    { name: 'C', eliminated_by: 'Zero data retention' },
  ],
  chosen: 'A',
  rationale: 'A clears the constraint with the least work.',
  reversible: true,
  evidence: [{ claim: 'A allows zero retention.', source: 'https://example.com', as_of: '2026-11-01' }],
  verify_before_relying: ['Confirm in the account.'],
});

test('decision: a well-formed record has no findings', () => {
  assert.deepEqual(checkDecision(decision(), { today: '2026-11-06' }), []);
});

test('decision: choosing an eliminated option is an error', () => {
  const doc = decision();
  doc.chosen = 'C';
  assert.ok(checkDecision(doc, { today: '2026-11-06' }).some((f) => f.code === 'CHOSEN_ELIMINATED'));
});

test('decision: bad ranks, no reason, stale and third-party evidence are reported', () => {
  const doc = decision();
  doc.options[1].ranks.time = 9;
  delete doc.options[1].why;
  doc.evidence = [{ claim: 'Old', source: 'https://example.com', as_of: '2026-01-01', kind: 'third-party' }];
  const found = checkDecision(doc, { today: '2026-11-06' }).map((f) => f.code);
  for (const code of ['BAD_RANK', 'NO_REASON', 'STALE_EVIDENCE', 'THIRD_PARTY_FACT']) assert.ok(found.includes(code), code);
});

test('decision: exports to the engagement decision shape', () => {
  const out = toEngagementDecision(decision());
  assert.equal(out.chosen, 'A');
  assert.equal(out.status, 'proposed');
  assert.deepEqual(out.alternatives.map((a) => a.option), ['B', 'C']);
  assert.match(out.alternatives[1].why_not, /Fails: Zero data retention/);
  assert.equal(out.evidence[0].as_of, '2026-11-01');
});

test('cli: a decision file saved with a byte-order mark still parses', () => {
  const file = join(temp, 'bom.json');
  writeFileSync(file, `\uFEFF${JSON.stringify(decision())}`);
  assert.equal(spawnSync('node', [cli, 'decision', file, '--today', '2026-11-06']).status, 0);
});

test('cli: bad usage exits 2 and a broken decision exits 1', () => {
  assert.equal(spawnSync('node', [cli, 'bogus']).status, 2);
  assert.equal(spawnSync('node', [cli, 'decision']).status, 2);
  const file = join(temp, 'd.json');
  writeFileSync(file, JSON.stringify({ question: 'Q' }));
  assert.equal(spawnSync('node', [cli, 'decision', file]).status, 1);
  writeFileSync(file, '{not json');
  const result = spawnSync('node', [cli, 'decision', file]);
  assert.equal(result.status, 1);
  assert.match(result.stderr.toString(), /not valid JSON/);
  writeFileSync(file, JSON.stringify(decision()));
  assert.equal(spawnSync('node', [cli, 'decision', file, '--today', '2026-11-06']).status, 0);
  assert.equal(JSON.parse(execFileSync('node', [cli, 'decision', file, '--to-engagement']).toString()).chosen, 'A');
});
