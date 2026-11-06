---
as_of: 2026-11-06
---
# Observability conventions and their maturity

Read this when tracing, cost attribution or evaluation portability is a constraint, or when "supports OpenTelemetry" is about to count as a pass.

## Status

The OpenTelemetry GenAI semantic conventions live in the `semantic-conventions-genai` repository. Every page reviewed (agent spans, spans, client inference, metrics, token metrics, execute-tool, MCP, A2A) carries "Status: Development". The few Stable attributes (`error.type`, `server.address`, `exception.*`) come from the general conventions. Names are visibly still moving. The metrics page names a `gen_ai.invoke_agent.internal` span, the A2A page names `gen_ai.client.invoke_agent`, and the agent spans page describes the span by operation name.

So pin the instrumentation version, put emission behind one internal module, and have evaluators read a small subset: operation name, agent name, conversation ID, tool spans, usage.

## What the backends actually claim

"OpenTelemetry" on a vendor page rarely means these conventions.

| Backend | Claim as printed | Convention conformance |
| --- | --- | --- |
| AgentCore | Traces to CloudWatch. The agent log group destination, default for new agents in supported Regions since July 20, 2026, needs CloudWatch Transaction Search and ADOT 0.18.0 or later | Evaluations reads GenAI conventions or OpenInference. No statement about all emitted spans |
| Foundry hosted agents | Protocol libraries emit OpenTelemetry by default into injected Application Insights | No version stated. Tracing for any framework was public preview on 2026-06-02 |
| Container Apps | Managed OpenTelemetry agent with export destinations | None. It carries what you emit |
| Agent Runtime | OpenTelemetry on by default for newly deployed ADK agents (June 18, 2026). ADK 2.6.0 or later can emit `gen_ai` metrics that follow the conventions, set by `GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY` (August 13, 2026) | The one explicit metrics claim found, for ADK only |
| Cloud Run | Names Langfuse and Arize as tools you can deploy | Page does not mention OpenTelemetry |
| Claude Managed Agents | OpenTelemetry export in beta since October 14, 2026, configured as a destination in the Console | None found |
| OpenAI Agents API | Observability page not reviewed. Trace grading covers SDK apps and Agent Builder | None found on pages reviewed. The Agents SDK page describes its own tracing and does not mention OpenTelemetry |

## Rules from the conventions that change a design

- **Content capture is off by default.** `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT` is `NO_CONTENT` unless set, and an unknown value falls back to that. The spans page recommends storing content externally and recording references in production where telemetry volume or sensitive data is a concern. If a design promises replayable prompts in traces, it needs an explicit decision here.
- **Cost.** `gen_ai.client.inference.usage.*` counters are the instruments for consumption and "a proxy for cost approximation". Per-operation token histograms "should not be used" for totals. Instrumentation MUST report billable tokens when both billable and used exist. Input tokens include cached tokens, and output tokens include reasoning tokens. Cache read, cache write and reasoning are subsets, so do not add them to the totals.
- **Agent name.** `gen_ai.agent.name` must be low cardinality. Do not use framework defaults such as "StateGraph". Leave `gen_ai.conversation.id` empty when no real identifier exists, rather than filling it with a new UUID or a trace ID.
- **Provider value.** `gen_ai.provider.name` identifies the telemetry flavor and can differ from the true upstream when a gateway sits in between. Do not use it alone to attribute spend through a gateway.
- **Flow control.** `invoke_agent` is for LLM-driven flow and `invoke_workflow` for application-defined flow.

## Across protocol hops

- **MCP.** Trace context travels in `params._meta` (`traceparent`, `tracestate`, `baggage`, unprefixed). The MCP 2026-07-28 changelog documents the same keys under SEP-414, so this holds on the current revision. MCP instrumentation should enrich an existing tool span rather than make a duplicate. `isError: true` on a result maps to `error.type` of `tool_error`.
- **A2A.** Client and server spans and `a2a.*` attributes are defined, but no metrics, no events and no rule for propagating trace context. The page never mentions `traceparent`. `GetTask` polls without the original parent context become separate traces correlated by `a2a.task.id`. Test whether the trace joins across a hop before promising end-to-end traces.
- **Gateways.** Google's Agent Gateway Cloud Trace integration was Preview on 2026-09-30.

## Evaluation portability

AgentCore Evaluations accepts generic telemetry in the GenAI conventions or OpenInference, which is the documented exit for frameworks it does not name. Foundry playground evaluations bill by consumption, so check that before a load test. Google names Gemini 2.5 Flash as the default judge on its quotas page and gives no accuracy data for it. Treat every managed evaluator score as unvalidated until you compare it with your own labelled set.

## Spike gate

Run one real request through agent, tool and sub-agent on the chosen backend. Pass when one trace shows all hops with the attributes your evaluators read, and token counts match the provider's bill for that request. Fail when a hop starts a new trace, or usage is missing on a streamed response.

## Sources

- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-spans.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-metrics.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-token-metrics.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/mcp.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/a2a.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/execute-tool.md
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/client-inference.md
- https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md
- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html
- https://aws.amazon.com/blogs/machine-learning/build-reliable-ai-agents-with-amazon-bedrock-agentcore-evaluations/
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- https://learn.microsoft.com/en-us/azure/foundry/concepts/observability
- https://devblogs.microsoft.com/foundry/whats-new-in-microsoft-foundry-build-2026/
- https://learn.microsoft.com/en-us/azure/well-architected/service-guides/azure-container-apps
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas.md.txt
- https://docs.cloud.google.com/run/docs/ai-agents.md.txt
- https://platform.claude.com/docs/en/release-notes/overview
- https://developers.openai.com/api/docs/guides/agents
- https://developers.openai.com/api/docs/guides/agent-evals
- https://openai.github.io/openai-agents-python/
