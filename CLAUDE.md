# CLAUDE.md: agent-stack

A Claude Code plugin. The deliverables are the skills in `skills/`, the fact sets in `data/` and the engine in `scripts/`.

## Principles

- **Facts carry their evidence.** Every fact has a value, a source, and a note when it is conditional, unstated or in conflict. Never turn silence into "no". Prefer the operator's page over a provider's description of it, and both over a third party.
- **Perishable by design.** Each set and reference has an `as_of` date, and `stack.mjs freshness` reports age. Prices are not shipped.
- **Self-contained.** Nothing at run time depends on anything outside this repo. Sources are public URLs. `tests/plugin.test.mjs` enforces this and the public-language rules.
- **Scope stays narrow.** AWS, Azure and Google Cloud, direct access to the frontier providers, at most three frontend stacks. Adding a stack means retiring one.
- **References hold only what an expert would not already know.** Traps, limits, conflicts between vendors, measured evidence and stated nulls.

## Refreshing facts

Re-read each source page, update the fact and its note, then set the set's `as_of`. Run `stack.mjs check-data` until it reports 0 problems, and `npm test`. Record a new conflict rather than choosing a side.

## Changing a skill

Run the task without the skill first and record what actually goes wrong, then write the minimum that fixes it. Re-run with the skill to confirm. Reading a skill cannot show whether it helps.

- Directory name, frontmatter `name` and the command stay equal.
- `description` states the capability; `when_to_use` holds the triggers. Neither reads as a procedure.
- References sit one level deep and are linked from the body.
- Never write a dollar sign followed by a digit in a `SKILL.md`: argument substitution rewrites it, even inside code blocks.

## Releasing

The version lives in `.claude-plugin/plugin.json` and `package.json`. Bump both, then tag `vX.Y.Z`. The marketplace entry is pinned separately by tag and commit.

## Git

Never commit directly to `main`. Work on a feature branch or worktree, rebase onto latest and squash-merge.
