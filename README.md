# agent-stack

Technology selection for AI products on AWS, Azure and Google Cloud, with direct access to the frontier model providers. It compares frontier models, cloud agent backends and frontend stacks from dated, sourced facts, then helps you write a decision you can defend.

## What it adds

Agents can research these questions on the web, but each answer costs a long reassembly of route-specific facts, and the mistakes are specific:

- **Capacity arithmetic done with the wrong rules.** The same "tokens per minute" means different things on different routes. Some multiply output tokens against the quota, some reserve `max_tokens` up front, and some count only uncached input. `stack.mjs capacity` computes each route its own way and names the limit that binds.
- **Silence read as no.** Every fact is `yes`, `no`, `conditional`, `unstated` or `conflict`, with its source. `stack.mjs gate` eliminates only on a real `no` and turns the rest into a list of things to verify.
- **Vendors that disagree.** Where two first-party pages conflict, the fact says so and quotes both sides.
- **Third-party claims.** Facts come from the operator's own pages, and a decision record warns when one rests on a third party.

The facts are a dated snapshot. `stack.mjs freshness` reports what has aged, and the skills tell the agent to re-check decision-driving facts on the listed source pages.

## Skills

| Skill | Use it to |
|---|---|
| `stack-models` | Choose a frontier model and access route, and size throughput |
| `stack-backend` | Choose where an agent runs: managed runtime, container host or provider-managed |
| `stack-frontend` | Choose among at most three cutting-edge frontend stacks, and how the UI talks to the agent |

## The command line

```bash
node scripts/stack.mjs sets
node scripts/stack.mjs gate models --require zero_retention --where cloud=aws
node scripts/stack.mjs facts models <option-id>
node scripts/stack.mjs capacity <option-id> --agents 100 --context-tokens 150000 --turn-seconds 30 --output-per-turn 1800 --cache-read-share 0.9 --cache-write-share 0.05
node scripts/stack.mjs decision decision.json
node scripts/stack.mjs freshness
```

## Scope

AWS, Azure and Google Cloud, plus OpenAI, Anthropic and Google directly. At most three frontend stacks. Prices are deliberately left out because they change often and live on the vendors' pages; read them at decision time.

## Requirements

Node.js 22 or later. No dependencies. The facts ship with the plugin, so it works offline; checking them against live pages needs network access.

## Pairing with agent-sa

[agent-sa](https://github.com/ehartye/agent-sa) turns a customer use case into a validated engagement file and generated deliverables. `stack.mjs decision <file> --to-engagement` prints a decision in the shape that file uses. It is optional: this plugin works on its own.

## License

MIT
