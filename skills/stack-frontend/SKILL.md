---
name: stack-frontend
description: Selects a frontend stack and host for an AI product from dated, sourced facts and writes a decision record that the plugin's checker accepts.
when_to_use: Use for "which frontend for our AI product", streaming chat UI, human approval of tool calls in the UI, generative UI, sharing one agent across web and mobile, Next.js versus SvelteKit for AI, AG-UI or CopilotKit, MCP Apps, or hosting a Next.js AI app on AWS, Azure or Google Cloud (Amplify, ECS Express Mode, Fargate, CloudFront with Lambda, Static Web Apps, Container Apps, Cloud Run, Firebase App Hosting). Not for choosing a model (use stack-models) or an agent backend (use stack-backend). Not for general UI design, branding or visual polish.
---

# stack-frontend

This skill produces a frontend decision: one of at most three stacks, an optional protocol layer, a host, and a decision record that `decision` checks with zero errors. The three stacks are Next.js with the AI SDK, SvelteKit with the AI SDK Svelte bindings, and the protocol-led layer (AG-UI with CopilotKit, MCP Apps) that sits on top of a framework so several clients can share one agent. Other stacks are on a watch list and are not ranked.

`<plugin-root>` is the directory holding `scripts/`, two levels up from this skill's directory. Resolve it from the SKILL.md file you loaded, not the current directory.

## Hard rules

1. Cells marked `unstated`, `conflict` or `conditional` are not passes and not failures. They go to `verify_before_relying` in the record, with the page to check.
2. The browser is not a trust boundary. Enforce every approval on the server; read [wire-protocols-and-approvals.md](references/wire-protocols-and-approvals.md) before you promise an approval flow.
3. Take tool-approval claims from the AI SDK's own pages, never from a third-party comparison. For Svelte the facts say `conditional`; say that.
4. The protocol layer is added to a framework. It is never a replacement for choosing one, and never a fourth stack.
5. Always pass `--where kind=stack` or `--where kind=hosting` to `gate`. Without it, the other kind shows as unstated for every cell.
6. Always pass `--require` on a hosting gate, at least `nextjs_ssr,streaming_responses`. A gate with none only lists options and passes none of them.
7. A host that supports server-rendered Next.js is not yet a host that streams. Do not recommend one before the spike in step 5 has a result.

## Procedure

1. **Name the hard constraints.** Ask for or extract: clouds allowed; where the agent runs (AgentCore, Microsoft Agent Framework or Foundry hosted agent, Google ADK, or inside the web app); client types (web only, or web plus mobile or chat platforms); team language and framework; whether an approved action is irreversible; the required host; data residency for conversation history. Done when each constraint is written as hard or soft, and each hard one is tied to a fact name in `fact_definitions`.

2. **Run the gate.** Map hard constraints to facts and run, for example:
   `node "<plugin-root>/scripts/stack.mjs" gate frontends --require streaming_chat,tool_approval --where kind=stack`
   Add `agentcore_fit`, `foundry_fit` or `google_adk_fit` for the agent's home. For hosts, use `--where kind=hosting --where cloud=aws` (or `azure`, `gcp`) with `--require nextjs_ssr,streaming_responses`. Done when every surviving option has its `VERIFY` and `CONDITIONAL` cells listed with their notes. `node "<plugin-root>/scripts/stack.mjs" facts frontends <id>` prints one option with source URLs.

3. **Decide whether the protocol layer is warranted.** It earns its cost when at least one of these holds: several kinds of client must share one agent; the agent runs as its own service on AgentCore, Agent Framework or ADK rather than inside the web app; a tool must ship its own UI into someone else's chat host. A single web client with the agent in the same app does not need it; the AI SDK alone is smaller. Keep two decisions apart: the open protocol, and CopilotKit's hosted Intelligence service for cross-device threads, which is a vendor product with no price or terms on the pages checked. Done when the record states which condition applied, or that none did.

4. **Check freshness.** Run `node "<plugin-root>/scripts/stack.mjs" freshness`. If the facts are over 90 days old, or the choice is hard to reverse, reopen the source pages for every cell that decided the outcome, and prefer the operator's or framework vendor's page over a blog or a comparison. Done when each deciding cell has been read live, or is listed in `verify_before_relying`.

5. **Spike streaming, timeouts and approvals on the chosen host.** Run the six checks in [hosting-traps.md](references/hosting-traps.md) through the same gateway, CDN and Node version as production. If approvals are in scope, add the four negative tests from the approvals reference. Done when each check has a recorded result, including any failure.

6. **Write the decision record and check it.** Save JSON like the sketch below, then run `node "<plugin-root>/scripts/stack.mjs" decision <file>`. Fix every error. Explain or fix each warning. Done when it reports zero errors and no unexplained warning. Add `--to-engagement` if the result belongs in an engagement file.

Rank each dimension from 1 to the number of surviving options; ties are allowed. Run `decision-format` for the field list.

```json
{
  "question": "Which frontend stack and host for ...?",
  "constraints": [{ "name": "agent runs on AgentCore", "hard": true }],
  "options": [
    { "name": "Next.js with the AI SDK", "why": "...", "ranks": { "time": 1, "risk": 2, "complexity": 1, "best_practice": 1, "maintainability": 2 } },
    { "name": "SvelteKit with the AI SDK", "eliminated_by": "needs a documented approval UI; fact is conditional" }
  ],
  "chosen": "Next.js with the AI SDK",
  "rationale": "...",
  "reversible": true,
  "evidence": [{ "claim": "...", "source": "https://...", "as_of": "2026-11-06", "kind": "vendor" }],
  "verify_before_relying": ["Streaming holds on the chosen host through the production gateway"]
}
```

When the decision has several layers, give each option one name that lists them all, in the form `<framework> + <protocol layer or "no protocol layer"> + <host>`, for example `Next.js with the AI SDK + AG-UI with CopilotKit + ECS Express Mode`. Set `chosen` to that exact string. In `rationale`, give one sentence per layer saying why it was picked, and add `evidence` for each. Compare whole combinations in `options`, not a framework against a host.

Rank only surviving options, 1 for best on each of the five dimensions. Set `eliminated_by` only where a vendor page says no, or a hard constraint fact is `no`. A `conditional` cell is a reason to spike, not to eliminate.

## References

- [wire-protocols-and-approvals.md](references/wire-protocols-and-approvals.md): read before designing or promising human approval, choosing between the AI SDK stream and AG-UI, or putting AG-UI on AgentCore, Foundry or ADK. Covers enforcing approvals on the server.
- [hosting-traps.md](references/hosting-traps.md): read before naming a host, and when writing the spike. Per-host limits, version gaps and the six checks.
- [survey-evidence.md](references/survey-evidence.md): read before citing State of JS in a record. What it says, and what the pages reviewed cannot support.
- [watch-list.md](references/watch-list.md): read when asked for Angular, Vue, Astro, TanStack Start, A2UI or any fourth option, and why none is admitted.

The facts are in `data/frontends.json`. `node "<plugin-root>/scripts/stack.mjs" sets` lists the fact names.
