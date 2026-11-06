---
as_of: 2026-11-06
---
# Long-running work and durable execution

Read this when a run outlives a request, waits on a person, or must not repeat a paid or side-effecting step. Every number is the vendor's printed default on a living page. No vendor reviewed here publishes failure-rate or recovery measurements.

## Three different things get called "long-running"

| Question | Mechanism | Does not give you |
| --- | --- | --- |
| Can the connection close while work continues? | Background or asynchronous mode | Survival of a process crash |
| Can the session come back after idle? | Persisted files or history on new compute | Continuation of the code that was running |
| Can a crashed run continue without repeating finished work? | Checkpoint and replay, or resilient tasks | Exactly-once tool side effects |

Microsoft states the first split outright: background mode lets work continue after the request returns, while resilient execution preserves work after the process stops. Decide which row the requirement means before reading any limit.

## Printed time limits

| Option | Limits | Not stated |
| --- | --- | --- |
| AgentCore, either compute type | Synchronous 15 minutes; streaming or WebSocket 60 minutes. The quotas page gives these no compute qualifier | |
| AgentCore microVM | Asynchronous job and session 8 hours; `maxLifetime` 60 to 28,800 seconds; idle default 900 seconds | What memory survives replacement |
| AgentCore Instances | Asynchronous job and agent lifetime up to 14 days, 1,209,600 seconds, only after raising `maxLifetime` on the runtime and the capacity provider, which both default to 8 hours; 9 Regions; EC2 in your account, so EC2 quotas also apply | State across the limit; session isolation on a shared instance |
| Foundry hosted agents | Idle 120 to 14,400 seconds, default 900; deleted after 30 days of inactivity | Any maximum turn or run length |
| Gemini Agent Runtime | "long-running operations (up to 7 days)", release note of 2026-04-22 | What resumes after failure |
| Lambda durable functions | Executions up to one year; waits suspend without compute charges | Pricing, determinism rules (pages not reviewed) |
| Azure Durable Extension | "days or weeks" for orchestrations; no maximum printed | Scheduler capacity (linked page) |
| Claude Managed Agents | "minutes or hours"; no maximum printed | Rate limits are on a reference page not reviewed |
| OpenAI Agents API | "Long-running tasks"; no maximum printed | Limits |
| Cloud Run | Job tasks up to 168 hours (12 with GPUs); instances restart after 7 days of continuous execution; services 60 minutes per request | What survives a restart |
| Container Apps | Ingress request time out 240 seconds, or custom on premium ingress. The quotas page prints no run or job duration | Whether 240 seconds is idle or total; job limits (not reviewed) |
| ECS on Fargate, Express Mode | No task time limit on the pages reviewed. Load balancer idle timeout defaults to 60 seconds. AWS can retire tasks, and Fargate Spot gives a two-minute warning | ECS quotas (separate page) |

Traps in these numbers:

- **Request timeouts and job limits are different clocks.** A request timeout or load balancer idle timeout bounds one HTTP exchange. A job, task or instance limit bounds the work. Cloud Run's 168 hours applies to job tasks and does not extend a service's 60-minute request, so a run that outlives its request needs a job or background worker that the client polls.
- **AgentCore enforces the lifetime limit.** On microVMs, the quotas page says the environment terminates regardless of activity at the limit. On Instances it stops the agent after any in-flight invocation finishes, and the instance limit terminates regardless of activity. The idle timer resets on each call; the lifetime timer does not. The next call with that session ID gets a new microVM.
- **AgentCore state.** The how-it-works page says session state "is ephemeral" and points to Memory for durability. The release notes describe managed session storage that keeps the filesystem across stop and resume (1 GB per session, 14-day retention), labelled Public Preview in March 2026, with no later GA entry found. The quotas page lists its limits with no label. Test what survives. S3 Files and EFS access points can be mounted as well.
- **Foundry compute follows the session.** Idle means compute is gone and `$HOME` and `/files` are saved. Quota counts only provisioned or running sessions, but resuming needs quota and can fail with 429 `session_quota_exceeded`, `regional_session_quota_exceeded` or `subnet_exhausted`. Build retry into resume.
- **Foundry session is not conversation.** Reusing `agent_session_id` does not replay messages, and `previous_response_id` alone does not pick the same sandbox. On Invocations, only the query string parameter routes; a body field or header does not.
- **Foundry stop.** Stopping a session ends the container an in-flight turn runs on. If your handler checkpoints in time, the turn stays in progress; if not, it is forcibly ended, like a cancel. A stopped session "isn't guaranteed to restart on its own".
- **Foundry idle change.** You cannot change idle timeout in place: create a new agent version. Values over 3,600 seconds need `azure.ai.agents` extension 1.0.0-beta.19 or later. The .NET SDK does not expose it. Versions are immutable and traffic splitting is not supported.
- **Google quota.** The default of 90 queries per minute per project and region, 10 concurrent bidirectional connections and 100 resources is a long way from Google's own sizing example (750 queries a minute for 250 users, 50 percent buffer included). Request the increase before a load test.

## Durable execution options actually documented

**AWS Lambda durable functions.** Checkpoint and replay inside Lambda: the handler re-executes from the start and skips completed steps. Steps, waits, `waitForCallback`, `waitForCondition`. AWS's example uses a 7-day callback timeout. AWS positions these for logic in Lambda and Step Functions for visual orchestration across services. AgentCore connects to Step Functions in both directions: a Gateway connector exposes state machines as MCP tools, and Step Functions can run harnesses. Neither is part of Runtime itself. AWS's token saving claim is mechanism only, with no measurement.

**Microsoft Durable Extension for Agent Framework.** Hosts on Azure Functions or your own compute, against Durable Task Scheduler. Installed from prerelease packages. Details an expert will not guess:

- Checkpointing "doesn't make tools or external writes transactional or exactly-once". A failure after an external write but before a commit can run the write again. Make tools idempotent.
- `202` means dispatch only. `410` means completion is known but the result is gone, and may be success or failure: read `x-ms-durable-outcome`, and do not resubmit. These statuses are for generated .NET Functions endpoints; Python differs.
- `ResultRetentionPeriod` defaults to 60 seconds in .NET. Session TTL, history retention, compaction, result retention and blob lifecycle are five separate policies. Deleting a session does not clean up offloaded blobs.
- Stream completion does not confirm durable completion. Reconnecting streams need a broker such as Redis.
- Upgrades: entity migration "doesn't repair workflow replay compatibility". Affected older histories must finish on their original workers and hub. Python hosts must choose a deployment strategy.

This is distinct from Foundry hosted agents. Microsoft's own page contrasts the two: durable agents are code-first hosting you deploy, Agent Service is managed infrastructure. A hosted agent can instead keep framework checkpoints in the state store (30-day idle window by default) or use opt-in resilient recovery, whose page was not reviewed.

**Google.** No durable-execution page was found. Sessions keep events and sandboxes pause and resume with file state. Do not infer checkpoint and replay from these.

**Provider-managed harnesses.** Anthropic says sessions resume cleanly and describes a replacement harness rebuilding from an append-only session log. OpenAI says it manages recovery and durable sessions. Both describe outcomes, not guarantees on tool side effects, and the latency figures in Anthropic's post are its own. Durable storage has a data-handling price: Claude Managed Agents is not eligible for Zero Data Retention or HIPAA BAA coverage, including self-hosted sandboxes; the OpenAI Agents API keeps state until deleted, does not support Zero Data Retention, and supports data residency only in the United States. Both are beta.

## Protocol layer

MCP 2026-07-28 removed SSE resumability: a broken response stream loses the in-flight request, and the client must re-issue it with a new request ID. Long tool calls belong in the Tasks extension, where a task ID survives disconnects. AgentCore Gateway documents Tasks on 2026-07-28 (October 2026). Task cancellation is cooperative: the server need not stop. A2A says streamed messages "MUST NOT be considered a reliable delivery mechanism", so put outputs in artifacts. See [protocols.md](protocols.md).

## Spike gates for durability

1. Kill the process mid-run on the real host. Pass when completed steps do not re-run and the run finishes. Fail when a paid model call or tool write repeats.
2. Inject a failure after a tool write and before commit. Pass when the idempotency key stops the second write.
3. Wait past the idle timeout and the lifetime limit with a real session. Pass when the state you depend on is present.
4. Exhaust session quota and confirm resume retries rather than losing work.

## Sources

- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-lifecycle-settings.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html
- https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- https://learn.microsoft.com/en-us/azure/container-apps/quotas
- https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview
- https://docs.cloud.google.com/run/quotas
- https://aws.amazon.com/blogs/compute/building-fault-tolerant-multi-agent-ai-workflows-with-aws-lambda-durable-functions/
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/manage-hosted-sessions
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/limits-quotas-regions
- https://learn.microsoft.com/agent-framework/integrations/durable-extension
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/agent-quotas.md.txt
- https://platform.claude.com/docs/en/managed-agents/overview
- https://www.anthropic.com/engineering/managed-agents
- https://developers.openai.com/api/docs/guides/agents-api/overview
- https://developers.openai.com/api/docs/guides/agents
- https://developers.openai.com/api/docs/guides/your-data
- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://modelcontextprotocol.io/extensions/tasks/overview
- https://a2a-protocol.org/latest/specification/
