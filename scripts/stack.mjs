#!/usr/bin/env node
// agent-stack command line. No dependencies.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capacity, formatCapacity, workload } from './lib/capacity.mjs';
import { dataDir, loadSets, validateSet } from './lib/data.mjs';
import { checkDecision, toEngagementDecision } from './lib/decision.mjs';
import { formatGate, gate, parseMin, parseWhere } from './lib/gate.mjs';

const USAGE = `usage:
  stack.mjs sets
  stack.mjs gate <set> [--require fact,fact] [--where field=value]... [--min fact=number]... [--json]
  stack.mjs facts <set> [option-id]
  stack.mjs capacity <option-id> --agents N --context-tokens N --turn-seconds N --output-per-turn N
            [--max-tokens N] [--cache-read-share 0..1] [--cache-write-share 0..1] [--duty-cycle 0..1]
            [--assume-multiplier N] [--tier name] [--set models] [--json]
  stack.mjs freshness [--today YYYY-MM-DD] [--max-age-days 90]
  stack.mjs check-data
  stack.mjs decision <file.json> [--today YYYY-MM-DD] [--json] [--to-engagement]
  stack.mjs decision-format

Exit codes: 0 fine, 1 findings or stale facts, 2 bad usage.`;

function parse(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith('--') ? true : next;
    if (value !== true) i += 1;
    if (key === 'where' || key === 'min') (flags[key] ??= []).push(value);
    else flags[key] = value;
  }
  return { positional, flags };
}

function die(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function number(flags, key, fallback) {
  if (flags[key] === undefined) {
    if (fallback !== undefined) return fallback;
    die(`--${key} is required\n\n${USAGE}`);
  }
  const value = Number(flags[key]);
  if (!Number.isFinite(value)) die(`--${key} must be a number`);
  return value;
}

function getSet(name) {
  if (!name) die(USAGE);
  const set = loadSets().get(name);
  if (!set) die(`no set named "${name}". Sets: ${[...loadSets().keys()].join(', ')}`);
  return set;
}

function cmdSets() {
  for (const [name, set] of loadSets()) {
    process.stdout.write(`${name}: ${set.title}, ${set.options.length} options, as of ${set.as_of}\n  facts: ${Object.keys(set.fact_definitions).join(', ')}\n`);
  }
}

function cmdGate({ positional, flags }) {
  const set = getSet(positional[1]);
  const require = typeof flags.require === 'string' ? flags.require.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let report;
  try {
    report = gate(set, { require, where: parseWhere(flags.where), min: parseMin(flags.min) });
  } catch (error) {
    die(error.message);
  }
  process.stdout.write(flags.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatGate(report, set)}\n`);
}

function cmdFacts({ positional }) {
  const set = getSet(positional[1]);
  if (!positional[2]) {
    for (const o of set.options) process.stdout.write(`${o.id}  (${o.name})\n`);
    return;
  }
  const option = set.options.find((o) => o.id === positional[2]);
  if (!option) die(`no option "${positional[2]}" in ${positional[1]}. Run: stack.mjs facts ${positional[1]}`);
  const lines = [`${option.name} (${option.id}), facts as of ${set.as_of}`];
  for (const [key, fact] of Object.entries(option.facts ?? {})) {
    const urls = fact.sources.map((id) => set.sources[id]?.url).join(' ');
    lines.push(`- ${key}: ${fact.value}${fact.note ? `. ${fact.note}` : ''} [${urls}]`);
  }
  if (option.quota) lines.push(`- quota: ${JSON.stringify(option.quota)}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function cmdCapacity({ positional, flags }) {
  const set = getSet(typeof flags.set === 'string' ? flags.set : 'models');
  const option = set.options.find((o) => o.id === positional[1]);
  if (!option) die(`no option "${positional[1]}". Run: stack.mjs gate models`);
  let load;
  try {
    load = workload({
      agents: number(flags, 'agents'),
      contextTokens: number(flags, 'context-tokens'),
      turnSeconds: number(flags, 'turn-seconds'),
      outputPerTurn: number(flags, 'output-per-turn'),
      maxTokens: flags['max-tokens'] === undefined ? undefined : number(flags, 'max-tokens'),
      cacheReadShare: number(flags, 'cache-read-share', 0),
      cacheWriteShare: number(flags, 'cache-write-share', 0),
      dutyCycle: number(flags, 'duty-cycle', 1),
    });
  } catch (error) {
    die(error.message);
  }
  let report;
  try {
    report = capacity(option, load, { assumeMultiplier: flags['assume-multiplier'] === undefined ? undefined : number(flags, 'assume-multiplier'), tier: typeof flags.tier === 'string' ? flags.tier : undefined });
  } catch (error) {
    die(error.message);
  }
  process.stdout.write(flags.json ? `${JSON.stringify({ ...report, as_of: set.as_of }, null, 2)}\n` : `Facts as of ${set.as_of}.\n${formatCapacity(report, load)}\n`);
  process.exit(report.status === 'over' ? 1 : 0);
}

function listReferences() {
  const skills = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
  if (!existsSync(skills)) return [];
  const found = [];
  for (const skill of readdirSync(skills)) {
    const dir = join(skills, skill, 'references');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) found.push(join(dir, file));
  }
  return found;
}

function cmdFreshness({ flags }) {
  const today = typeof flags.today === 'string' ? flags.today : new Date().toISOString().slice(0, 10);
  const maxAge = number(flags, 'max-age-days', 90);
  const age = (date) => Math.floor((Date.parse(today) - Date.parse(date)) / 86_400_000);
  let stale = 0;
  const report = (label, date) => {
    if (!date) {
      stale += 1;
      process.stdout.write(`UNDATED ${label}\n`);
      return;
    }
    const days = age(date);
    const old = days > maxAge;
    if (old) stale += 1;
    process.stdout.write(`${old ? 'STALE  ' : 'ok     '} ${label}: as of ${date} (${days} days)\n`);
  };
  for (const [name, set] of loadSets()) report(`data/${name}.json`, set.as_of);
  for (const file of listReferences()) {
    const head = readFileSync(file, 'utf8').slice(0, 400);
    const label = file.slice(file.indexOf('skills'));
    report(label.replace(/\\/g, '/'), head.match(/^as_of:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]);
  }
  if (stale > 0) process.stdout.write(`\n${stale} past ${maxAge} days. Check the live source pages before relying on them.\n`);
  process.exit(stale > 0 ? 1 : 0);
}

const DECISION_FORMAT = `A decision record is one JSON object:
  question: text
  constraints: list of { name: text, hard: true or false }
  options: list of { name: text, why: text unless chosen, eliminated_by: the hard constraint it fails,
                     ranks: { time, risk, complexity, best_practice, maintainability } for survivors, 1 is best }
  chosen: the name of one surviving option
  rationale: text
  reversible: true or false
  evidence: list of { claim: text, source: URL, as_of: YYYY-MM-DD, kind: vendor or third-party }
  verify_before_relying: list of text`;

function cmdDecisionFormat() {
  process.stdout.write(`${DECISION_FORMAT}\n`);
}

function cmdCheckData() {
  let problems = [];
  for (const [name, set] of loadSets(dataDir)) problems = problems.concat(validateSet(set, name));
  for (const p of problems) process.stdout.write(`${p}\n`);
  process.stdout.write(`${problems.length} problems\n`);
  process.exit(problems.length ? 1 : 0);
}

function cmdDecision({ positional, flags }) {
  if (!positional[1]) die(USAGE);
  const path = resolve(positional[1]);
  if (!existsSync(path)) die(`no such file: ${path}`);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    die(`${path} is not valid JSON: ${error.message}`, 1);
  }
  if (flags['to-engagement']) {
    process.stdout.write(`${JSON.stringify(toEngagementDecision(doc), null, 2)}\n`);
    return;
  }
  const findings = checkDecision(doc, { today: typeof flags.today === 'string' ? flags.today : undefined });
  const errors = findings.filter((f) => f.level === 'error').length;
  if (flags.json) process.stdout.write(`${JSON.stringify({ errors, findings }, null, 2)}\n`);
  else {
    for (const f of findings) process.stdout.write(`${f.level === 'error' ? 'ERROR' : 'warn '} ${f.code}: ${f.message}\n`);
    process.stdout.write(`${errors} errors, ${findings.length - errors} warnings\n`);
  }
  process.exit(errors ? 1 : 0);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}
const args = parse(process.argv.slice(2));
const commands = { sets: cmdSets, gate: cmdGate, facts: cmdFacts, capacity: cmdCapacity, freshness: cmdFreshness, 'check-data': cmdCheckData, decision: cmdDecision, 'decision-format': cmdDecisionFormat };
const command = commands[args.positional[0]];
if (!command) die(USAGE);
command(args);
