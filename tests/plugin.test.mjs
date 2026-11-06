// Guards the guarantees that matter for a public, self-contained plugin.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const SKIP = new Set(['.git', 'node_modules', '.playwright-mcp', 'out', 'dist']);
const TEXT = /\.(md|json|mjs|js|yml|yaml|txt)$/;

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (TEXT.test(name)) found.push(path);
  }
  return found;
}

const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, 'SKILL.md'))) : [];

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-z_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { fields, body: text.slice(match[0].length) };
}

test('shipped files never depend on or mention a private knowledge base, machine or person', () => {
  const forbidden = [
    [/wiki/i, 'a private knowledge base'],
    [/\b(the|our|my) vault\b|obsidian/i, 'a private knowledge base'],
    [/[A-Za-z]:\\Users\\|\/Users\/|\/home\/[a-z]/, 'a local path'],
    [/\bhartye\b/i, 'the owner'],
    [/\bbaseline (run|test)s?\b/i, 'how this was built'],
    [/\bclippings?\b|\bnot held\b|\bpage held\b|\bpages held\b|\bthe capture\b|\bin the capture\b/i, 'how the facts were collected'],
  ];
  const self = relative(root, fileURLToPath(import.meta.url));
  for (const file of walk(root)) {
    const rel = relative(root, file);
    if (rel === self || rel.startsWith('.claude-plugin') || rel === 'package.json' || rel === 'LICENSE') continue;
    const text = readFileSync(file, 'utf8');
    for (const [pattern, what] of forbidden) {
      assert.doesNotMatch(text, pattern, `${rel} mentions ${what}`);
    }
  }
});

test('every skill meets the format the listing and loader depend on', () => {
  for (const name of skills) {
    const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    const parsed = frontmatter(text);
    assert.ok(parsed, `${name}: frontmatter must start on line 1`);
    const { fields, body } = parsed;
    assert.equal(fields.name, name, `${name}: frontmatter name must match the directory`);
    assert.ok(fields.description, `${name}: description is required`);
    assert.ok(fields.when_to_use, `${name}: when_to_use is required`);
    const size = fields.description.length + fields.when_to_use.length;
    assert.ok(size <= 1536, `${name}: description and when_to_use are ${size} characters, over the listing cap`);
    assert.ok(body.split('\n').length <= 160, `${name}: body is too long`);
    assert.doesNotMatch(text, /\$[0-9]|\$ARGUMENTS/, `${name}: argument placeholders are rewritten at load time`);
    assert.match(body, /<plugin-root>/, `${name}: must say how to resolve the plugin root`);
  }
});

test('every reference is linked from its skill, one level deep, and every link resolves', () => {
  for (const name of skills) {
    const dir = join(skillsDir, name);
    const body = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const links = [...body.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map((m) => m[1]).filter((l) => !/^https?:/.test(l));
    for (const link of links) assert.ok(existsSync(resolve(dir, link)), `${name}: broken link ${link}`);
    const refDir = join(dir, 'references');
    if (!existsSync(refDir)) continue;
    for (const entry of readdirSync(refDir)) {
      const path = join(refDir, entry);
      assert.ok(statSync(path).isFile(), `${name}: references must be one level deep (${entry})`);
      assert.ok(links.includes(`references/${entry}`), `${name}: references/${entry} is not linked from SKILL.md`);
    }
  }
});

test('reference files name their public sources', () => {
  for (const name of skills) {
    const refDir = join(skillsDir, name, 'references');
    if (!existsSync(refDir)) continue;
    for (const entry of readdirSync(refDir)) {
      const text = readFileSync(join(refDir, entry), 'utf8');
      assert.match(text, /^## Sources/m, `${name}/${entry}: needs a Sources section`);
      assert.match(text, /https:\/\//, `${name}/${entry}: needs at least one public URL`);
      if (text.split('\n').length > 300) assert.match(text, /^## Contents/m, `${name}/${entry}: long files need a table of contents`);
    }
  }
});

test('commands named in skills exist in the command line tool', () => {
  const cliPath = readdirSync(join(root, 'scripts')).find((n) => n.endsWith('.mjs'));
  const cli = readFileSync(join(root, 'scripts', cliPath), 'utf8');
  const known = [...cli.matchAll(/^const commands = \{(.*)\};$/gm)][0][1];
  for (const name of skills) {
    const body = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    for (const m of body.matchAll(new RegExp(`scripts/${cliPath}"? +([a-z-]+)`, 'g'))) {
      assert.ok(known.includes(`${m[1]}:`) || known.includes(`'${m[1]}':`), `${name}: unknown command ${m[1]}`);
    }
  }
});
