---
name: stack-models
description: Selects a frontier model and the route to reach it from dated vendor facts, per-route quota arithmetic and a checked decision record.
when_to_use: Use when asked "which model should we use", "Claude, GPT or Gemini", "compare these models", "Bedrock or direct", "Foundry or Bedrock for Opus", "can we use Fable with zero data retention", "does this route keep our prompts", "EU-only processing", "HIPAA on this route", "how many agents will this quota carry", "will we hit rate limits", or "size our throughput". Not for agent runtimes, sandboxes and managed agent platforms (stack-backend). Not for UI frameworks and hosting (stack-frontend).
---

# Model and route selection

This skill produces a checked decision record that names one model on one route, with the hard constraints it passed, the binding quota on that route, and a bake-off plan.

Choose a model-and-route pair, never a model alone. The same model has different retention rules, features, quotas and lifecycle dates on each route, so an answer that names only a model is unfinished.

`<plugin-root>` is the directory holding `scripts/`, two levels up from this skill's directory. Resolve it from the SKILL.md file you loaded, not the current directory.

## Hard rules

1. Size capacity from the operator's table through the engine, never from a provider's sentence about quota.
2. `unstated` and `conflict` are neither pass nor fail. Read the cited page, or carry the row as an open question in the record.
3. Test any "released before", "all platforms" or "open to all" sentence against the release order and the route page before it decides anything.
4. Prices are not in this skill. Read them on the vendor's page at decision time and record the date. Prefer the operator's page over any third party.
5. Cross-vendor benchmark tables build a shortlist. Only a bake-off on the customer's tasks chooses.
6. Re-check every decision-driving fact on its source page when the set is past 90 days old or the decision is hard to reverse.

## Procedure

### 1. Name the hard constraints

List what eliminates an option: retention, processing geography, a compliance path, the cloud, must-have features, model access. Map each one to a fact name from `sets`. Write down anything the set does not record as a question for the vendor page.

Collect the workload in numbers: concurrent agents, context tokens per turn, seconds per turn, output tokens per turn, `max_tokens`, cache read share, cache write share, share of the day at peak.

Done when every constraint has a fact name or a named page to read, and the workload has numbers or labelled assumptions.

### 2. Run the gate

```
node "<plugin-root>/scripts/stack.mjs" sets
node "<plugin-root>/scripts/stack.mjs" gate models --require zero_retention,structured_outputs --where cloud=aws
node "<plugin-root>/scripts/stack.mjs" facts models claude-opus-5-5.bedrock-runtime
```

Filter with `--where` on `provider`, `model`, `route`, `cloud` or `operator`. Require `zero_retention`, not `retention_floor`: the floor reads the other way round, and `yes` means retention is forced.

A gate with no `--require` only lists options. A provider with no row on a cloud is not offered there in this snapshot, so confirm that on the provider's page rather than treating it as eliminated by a constraint.

Done when each option has a status of pass, conditional, verify or eliminated.

### 3. Treat conditional and verify rows honestly

- **conditional:** read the note and ask whether the customer meets the condition. For `regional_processing` the note names the geographies, so a gate pass does not mean EU. Some conditions carry an end date.
- **unstated:** the page checked is silent. Open the cited URL and look further, or ask the vendor. Never report it as unsupported.
- **conflict:** both vendors' positions are in the note. Decide which one the customer can test, and list the test.

Read [route-traps.md](references/route-traps.md) when a retention, residency or feature row decides the choice, when a vendor sentence seems to settle it, or before relying on a model's behaviour matching across routes.

Done when each surviving row is a pass, an accepted condition, or a named open question with who answers it.

### 4. Re-check what the decision rests on

```
node "<plugin-root>/scripts/stack.mjs" freshness
```

Open the source page for each fact that eliminated or chose an option, if the set is past 90 days or the choice is hard to reverse.

Done when each deciding fact has a date you read it, or the set is inside 90 days and the decision is reversible.

### 5. Run capacity on every surviving route

```
node "<plugin-root>/scripts/stack.mjs" capacity claude-opus-5-5.bedrock-runtime --agents 200 --context-tokens 150000 --turn-seconds 30 --output-per-turn 1500 --max-tokens 8000 --cache-read-share 0.85 --cache-write-share 0.05 --duty-cycle 0.5
```

Read the result by status:

- **fits or tight:** name the binding limit and its share. Above 70 percent is tight.
- **over:** name the limit and the increase to request. Default quotas can be raised, so over is a lead-time item, not an elimination, until the operator refuses.
- **unknown with a stated multiplier gap:** run with `--assume-multiplier 1` and again with `10`, and report both as a range.
- **tiered routes (OpenAI, Azure OpenAI):** the result shows the lowest tier and names the lowest listed tier that fits. Use `--tier <name>` to see another. The figure is conservative because the pages do not say whether cached input counts.
- **unknown with an opaque note:** the note says where the number lives.

Read [quota-counting.md](references/quota-counting.md) for what each route counts and the worked arithmetic.

Done when each surviving route has a binding limit and share, or a named place the number will come from.

### 6. Design for documented behaviour

Read [reading-system-cards.md](references/reading-system-cards.md) when the work is agentic, security-adjacent, biology-adjacent or uses computer use. It lists the safeguard behaviours that change a design and what the cards cannot support.

Done when fallback, refusal and blocked-identifier handling are in the design or ruled out with a reason.

### 7. Plan the bake-off

Shortlist at most three pairs. Read [benchmark-limits.md](references/benchmark-limits.md) for how to run it and why published tables cannot replace it.

Done when the record names the task set, the route tested, the pass bar and cost per completed task as the measure.

### 8. Write and check the decision record

```json
{
  "question": "Which model and route for the claims agent?",
  "constraints": [{ "name": "No retention at rest", "hard": true }],
  "options": [
    { "name": "Opus 5.5 on bedrock-mantle", "why": "chosen", "ranks": { "time": 1, "risk": 1, "complexity": 1, "best_practice": 1, "maintainability": 1 } },
    { "name": "Sonnet 5.5 on Foundry Hosted on Azure", "why": "needs a large quota request first", "ranks": { "time": 2, "risk": 2, "complexity": 2, "best_practice": 2, "maintainability": 2 } },
    { "name": "Fable 5.1 on Foundry", "eliminated_by": "zero retention returns 400" }
  ],
  "chosen": "Opus 5.5 on bedrock-mantle",
  "rationale": "Why the facts and the bake-off point here.",
  "reversible": true,
  "evidence": [{ "claim": "Mode none is available", "source": "https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html", "as_of": "2026-11-06", "kind": "vendor" }],
  "verify_before_relying": ["Read allowed_modes for the model in the customer account"]
}
```

```
node "<plugin-root>/scripts/stack.mjs" decision record.json
node "<plugin-root>/scripts/stack.mjs" decision record.json --to-engagement
```

Run `decision-format` for the field list. Rank surviving options only, from 1 to the number of survivors. Quote vendor results with who ran them. Put every open question from step 3 and every account value from step 5 in `verify_before_relying`.

Done when `decision` reports 0 errors and each remaining warning is addressed in the rationale.
