---
as_of: 2026-11-06
---
# MCP and A2A: facts with status labels

Read this when a requirement names a protocol, or when "supports MCP" or "supports A2A" is doing work in a decision. Support claims rarely state a revision, so a gate pass does not prove the revision you need.

## MCP revision 2026-07-28

Labels below are as the specification's own changelog prints them. Earlier secondary posts described a release candidate and differ in places; the changelog wins.

**Removed or changed:**

- Protocol-level sessions and `Mcp-Session-Id` are gone. Servers that need state across calls mint explicit handles.
- The `initialize` handshake is gone. Each request carries its version and client capabilities in `_meta`.
- Servers MUST implement `server/discover`.
- SSE resumability and `Last-Event-ID` are gone. A broken stream loses the in-flight request and the client re-issues it.
- Server-initiated requests are replaced by Multi Round-Trip Requests (`InputRequiredResult`).
- `ping`, `logging/setLevel` and `notifications/roots/list_changed` are removed. The GET endpoint and `resources/subscribe` give way to `subscriptions/listen`.

**Deprecated, still functional during the window:** Roots, Sampling and Logging; the HTTP+SSE transport; `includeContext` values `thisServer` and `allServers`; OAuth Dynamic Client Registration in favor of Client ID Metadata Documents.

**Moved to an extension:** Tasks, now `io.modelcontextprotocol/tasks`. Poll `tasks/get`, send input with `tasks/update`, cancel with `tasks/cancel`. Statuses are `working`, `input_required`, `completed`, `failed` and `cancelled`. Cancellation is cooperative.

**Authorization:** "Authorization is OPTIONAL" in the specification, so a conformant server can have none. A server that does it MUST implement RFC 9728 metadata and MUST accept only tokens issued for itself. It MUST NOT pass a received token through to an upstream API, even when acting as an OAuth client upstream. The base includes OAuth 2.1 draft 13, an IETF draft that can still change.

**Observability:** The changelog documents trace context in `_meta` (`traceparent`, `tracestate`, `baggage`, SEP-414) as a minor change. The OpenTelemetry MCP page cites earlier revisions for the same rule, so the two agree.

## What each backend says about MCP

| Backend | Revision stated | Status label | Fact worth knowing |
| --- | --- | --- | --- |
| AgentCore Gateway | Tasks on `2026-07-28` | Release notes, October 2026 | Stateful `Mcp-Session-Id` sessions were also added to Gateway in May 2026 and Runtime in March 2026. Test which your client gets. External servers appear under both MCP and HTTP targets, with no guidance on which; only MCP targets get tool search and capability sync |
| Foundry Agent Service | Not stated | No label | Accepts only remote endpoints. `require_approval` defaults to `always` |
| Foundry Toolbox | Not stated | Public preview (2026-06-02 recap); later concept page labels only Skills as preview | Any MCP client can use it. Direct clients lose some delegation |
| Container Apps, self-hosted | Your choice | No label | Foundry's page says stateless only, linux/amd64, no privileged containers |
| Container Apps dynamic sessions | `2025-03-26` | Preview, API `2025-02-02-preview` | API key in `x-ms-apikey`, not bearer token |
| Azure Functions MCP extension | Not stated | GA per one trade-press report (2026-06-19) | Stateless only, no containerized servers. `npx` not supported |
| Cloud Run, self-hosted | Host page links `2025-03-26` | No label | Streamable HTTP only, not stdio |
| Cloud Run managed server (Google's, for operating Cloud Run) | Describes `2026-07-28` as stateless | Regional endpoint Preview | No API keys. With logging on, Model Armor logs the entire payload |
| Google managed servers | Not stated | 22 of 69 Cloud rows "(Preview)"; Workspace "Developer Preview" | Agent Platform MCP server for GA on 2026-04-22; unlabelled rows are not stated to be GA |
| Agent Gateway | MCP over SSE or HTTP POST | GA 2026-06-18 in the release notes; a policy page still says Private preview | Overview says GKE, Cloud Run and cross-cloud are coming soon; the GA note does not say this lifted. The setup guide describes IAM authorization for egress; check ingress controls separately |
| Claude Managed Agents | Not stated | Beta; MCP tunnels research preview | |
| OpenAI Agents API | Not stated | Public beta | Page for this API not reviewed; Responses API page passes OAuth tokens in `authorization` and defaults to approvals |

Do not assume a stateless-2026-07-28 client works with a host that describes older behaviour. Run the handshake against the real pair.

## A2A v1.0

The specification says "Latest Released Version 1.0.0". Neither A2A page reviewed gives a release date, so do not cite one from them.

Facts that surprise implementers:

- **Version default.** Clients MUST send `A2A-Version`, and an empty value is treated as 0.3. Several examples in the 1.0.0 specification show `A2A-Version: 0.3`, though its versioning section shows `1.0`. Copying the older ones negotiates the older version. Send `1.0` and fail on `VersionNotSupportedError`.
- **Breaking changes from 0.3.** Unified `Part` replaces `TextPart`, `FilePart` and `DataPart`. `kind` is removed. Enum values are `SCREAMING_SNAKE_CASE`. `message/send` is now `SendMessage`. Interfaces fold into `supportedInterfaces[]`.
- **Source of truth.** `a2a.proto` is normative. Build from it and an SDK's tests, not the prose examples.
- **Inside the project's own pages.** The migration page says implicit and password flows were removed; the specification still lists them as deprecated. Examples in 6.4 and 6.5 show `application/problem+json`, while section 11.6 and the migration page use `google.rpc.Status`.
- **Security is left to you.** Authorization is implementation-specific, card signing is optional, and `AUTH_REQUIRED` carries no scope semantics. Passing credentials in-band through an agent chain exposes them to every agent in that chain. Push webhooks need SSRF guards and idempotent receivers.

## What each backend says about A2A

| Backend | Label as printed | Note |
| --- | --- | --- |
| Foundry hosted agents and service | "A2A v1.0 (GA) and v0.3 (preview)" | Agent Framework 1.0 said "A2A 1.0 support coming soon" on 2026-04-03. That is the SDK, an earlier date, so confirm the SDK release you use |
| AgentCore Runtime | No version on the page | A2A protocol contract, and Gateway fronts agents through HTTP targets |
| Agent Runtime | Older overview "(preview)" | Quotas of 60 post and 600 get per minute are printed without a label. Agent Registry GA covers A2A 1.0 |
| Cloud Run | No label | Linked guide not reviewed |
| Container Apps, Claude Managed Agents, OpenAI Agents API | Silent on the pages checked | Silence is not "no". Your code can implement A2A on a container host |

## Sources

- https://modelcontextprotocol.io/specification/2026-07-28
- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
- https://modelcontextprotocol.io/extensions/tasks/overview
- https://a2a-protocol.org/latest/specification/
- https://a2a-protocol.org/latest/whats-new-v1/
- https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/mcp.md
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-core-concepts.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html
- https://learn.microsoft.com/azure/foundry/agents/how-to/mcp-authentication
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- https://learn.microsoft.com/en-us/azure/foundry/agents/overview
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-catalog
- https://learn.microsoft.com/azure/container-apps/mcp-overview
- https://devblogs.microsoft.com/foundry/whats-new-in-microsoft-foundry-build-2026/
- https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/
- https://infoq.com/news/2026/06/azure-functions-serverless-agent
- https://docs.cloud.google.com/run/docs/host-mcp-servers.md.txt
- https://docs.cloud.google.com/run/docs/use-cloud-run-mcp
- https://docs.cloud.google.com/mcp/supported-products.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/assign-identity-iam.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/set-up-agent-gateway.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/agent-quotas.md.txt
- https://docs.cloud.google.com/agent-builder/agent-engine/overview.md.txt
- https://platform.claude.com/docs/en/managed-agents/overview
- https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- https://developers.openai.com/api/docs/guides/agents-api/overview
