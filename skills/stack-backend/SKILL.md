---
name: stack-backend
description: Selects where an AI agent runs, among managed runtimes, container hosts and provider-managed harnesses on AWS, Azure, Google Cloud and direct APIs, with a checked decision record and spike gates for each unproven fact.
when_to_use: Use for "which agent platform", "Foundry or build our own", "AgentCore vs Foundry", "AgentCore vs Cloud Run", "where should a long-running agent run", "per-user identity for MCP tools", "act on behalf of the user", "durable execution for agents", "which vector store on Azure or GCP", or "is this agent platform GA". Not for choosing a model, a route or quota arithmetic (use stack-models). Not for choosing a UI framework or front-end hosting (use stack-frontend).
---
# Agent backend selection

This skill produces a checked decision record that names one agent backend, the options eliminated by hard constraints, and spike gates for every fact the vendor pages do not prove. Run the gate before forming a preference, because the snapshot already holds the limits and silences that an answer would otherwise reassemble page by page.

`<plugin-root>` is the directory holding `scripts/`, two levels up from this skill's directory. Resolve it from the SKILL.md file you loaded, not the current directory.

## Hard rules

1. Never read `unstated` as "no" or as "yes". It means the cited page is silent, so it becomes a spike gate.
2. A vendor page saying "supports" passes a gate, not a design. Status, revision and the note decide. Read the note on every row you rely on.
3. Quote limits from the operator's page. Third-party posts are leads, never evidence.
4. Attribute vendor claims. Nothing here is an independent test, and no neutral latency, reliability or price comparison was found. Say so if asked to rank on those.
5. Re-check live when the set is past 90 days old or the choice is hard to reverse (step 2).
6. Give the record to the decision check. A selection is not done until it reports no errors.

## Procedure

### 1. Name the hard constraints

Turn the request into facts and filters. A constraint is hard only if failing it ends the option. Write the rest down as preferences for ranking.

| The requirement sounds like | Require | Filter |
| --- | --- | --- |
| Tools act as the signed-in user | `per_user_identity` | |
| Runs for hours or waits days | `max_run_duration`, `durable_resume` | Add `--min max_run_duration=<hours>`, a number in hours (a week is 168): a stated limit below it eliminates, and no stated limit asks you to verify |
| One user must not reach another's state | `session_isolation` | |
| Runs generated or untrusted code | `sandboxed_code` | |
| Calls or hosts MCP tools | `remote_mcp` | |
| Other teams' agents call this one | `a2a` | |
| No public internet path | `private_networking` | |
| Production now, no preview terms | `ga_status` | |
| Traces go to our platform | `otel_tracing` | |
| We must stay on one cloud | | `--where cloud=aws`, `azure` or `gcp` |
| "Foundry or build our own" | | Run once with `--where kind=managed-runtime` and once with `--where kind=container-host` |

"Foundry Agent Service" covers hosted agents and prompt agents, which the gate treats as `foundry-hosted-agents` and `foundry-prompt-agents`. Ask which one is meant, or test both.

Also ask what the fact set does not cover: region, data retention, tenancy. Zero Data Retention or HIPAA is decisive for provider-managed options, and both of those options state they lack Zero Data Retention in the notes.

Done when each hard constraint maps to a fact or filter, or is listed as outside the set.

### 2. Run the gate

```
node "<plugin-root>/scripts/stack.mjs" freshness
node "<plugin-root>/scripts/stack.mjs" gate backends --require per_user_identity,durable_resume --where cloud=azure
node "<plugin-root>/scripts/stack.mjs" facts backends foundry-hosted-agents
```

Read the four statuses this way. `ELIMINATED` means a hard constraint fails on a stated `no`. `PASS` and `CONDITIONAL` survive; a condition goes in the record. `VERIFY` means `unstated` or `conflict`: keep the option and write a spike gate. Do not delete a `VERIFY` option because its row looks empty. `aws-container-host` has many `unstated` rows because the ECS pages reviewed say little about agents, not because it cannot do these things.

If `freshness` reports stale, or the decision is hard to reverse, open the source URLs printed for every fact that decides the outcome and confirm the value today. Check status labels first; they move fastest. Date what you confirm.

Done when each surviving option has a status and every decision-driving fact is either fresh or re-checked.

### 3. Read only the reference you need

| Reference | Read it when |
| --- | --- |
| [delegated-identity.md](references/delegated-identity.md) | Tools act for a user, multi-tenant use, or `per_user_identity` is a hard constraint |
| [long-running-and-durable.md](references/long-running-and-durable.md) | A run outlives a request, waits on a person, or must not repeat a step |
| [protocols.md](references/protocols.md) | A requirement names MCP or A2A, or a revision matters |
| [vector-stores.md](references/vector-stores.md) | Retrieval is in scope and the store is not settled |
| [observability.md](references/observability.md) | Tracing, cost attribution or evaluation portability is a constraint |

Done when each hard constraint has been read against its reference where one exists.

### 4. Turn verify rows into spike gates

For each `unstated`, `conflict` and decision-driving `conditional` row on a surviving option, write one gate with a pass and a fail that a person could observe in a day or two.

Example shapes:

- `per_user_identity`: two users on one app call the same tool. Pass: the tool's audit log shows each user, and user B cannot reach user A's session. Fail: one shared identity, or B gets A's data.
- `max_run_duration`: run a task at twice the expected length unattended. Pass: it finishes. Fail: an undocumented cutoff stops it.
- `durable_resume`: kill the process mid-run. Pass: finished steps do not repeat. Fail: a paid call or tool write repeats.
- `ga_status`: get the label in writing from the operator's page or support. Pass: GA or accepted preview terms. Fail: a preview your policy rejects.

Put every gate in `verify_before_relying`, with its pass and fail. If a failed gate would change the choice, say which option takes over.

Done when no surviving `unstated` or `conflict` row that matters lacks a gate.

### 5. Write and check the decision record

Fields: `question`, `constraints[{name, hard}]`, `options[{name, why, eliminated_by, ranks{time,risk,complexity,best_practice,maintainability}}]`, `chosen`, `rationale`, `reversible`, `evidence[{claim, source, as_of, kind}]`, `verify_before_relying[]`. Rank every surviving option from 1 on all five dimensions, with no rank on eliminated options. Set `evidence.as_of` to the set's date, or to the date you re-checked it live.

Consider the costs the gate cannot show when ranking. Hosted options couple session state to one vendor, and identity and policy layers are the hardest part to leave. MCP, A2A and OpenTelemetry telemetry are the portable parts. Those are judgments, so label them in `rationale`.

Rank each dimension from 1 to the number of surviving options; ties are allowed. Run `decision-format` for the field list.

```
node "<plugin-root>/scripts/stack.mjs" decision record.json
```

To carry the result into an engagement file, add `--to-engagement`.

Done when `decision` reports no errors, each warning is fixed or explained in your answer, and the answer names the chosen backend, what eliminated the others, and the spike gates.
