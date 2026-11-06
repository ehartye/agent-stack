---
as_of: 2026-11-06
---

# Wire protocols and approval semantics

Read this before you promise a human-approval flow, before you pick between the AI SDK stream and AG-UI, and before you write any "approve" button that gates a side effect. Statements are attributed to the page that makes them. Items marked **Design rule** are this plugin's own inference from those pages, not vendor text.

## Contents

- What each stream carries
- Approval, as each stack documents it
- Enforcing approvals on the server
- AG-UI on AWS and Azure: contract details that bite
- MCP Apps: what is and is not a security boundary
- What no page answers

## What each stream carries

| | AI SDK UI message stream | AG-UI event stream |
| --- | --- | --- |
| Shape | Message parts: text, typed `tool-<name>` parts with states, reasoning. Consumed by the SDK's own client bindings | Typed events: run lifecycle, text and tool-call start/content/end, state snapshot and JSON Patch delta, activity, reasoning, custom |
| Transport | HTTP response from your route | HTTP with SSE, or WebSocket |
| Who defines the client | The SDK (React, Svelte, Vue, Angular bindings) | Any client that reads the events; the project lists a terminal, Slack and Teams channels and React Native next to CopilotKit |
| Pause for a human | Tool part state `approval-requested`, then a response message | Run finishes with an `outcome` of type `interrupt`; a new run resumes it |

The AI SDK 7 post does not mention AG-UI, and the AG-UI pages do not mention the AI SDK. Vercel's Chat SDK Web adapter, linked from the AI SDK transport page, can serve one endpoint as either the AI SDK UI message stream or AG-UI, and says handlers are the same for both. That is a setting on a Chat SDK bot, not a bridge from an AI SDK stream. Outside it, a mixed design is a custom adapter. Decide the client contract first; the framework follows.

## Approval, as each stack documents it

**AI SDK (first-party pages).** In AI SDK 6 a tool carried `needsApproval`. AI SDK 7 deprecates that for `generateText`, `streamText` and `ToolLoopAgent`, and puts the policy on the agent or the call as `toolApproval`: a per-tool value, a per-tool function that may approve, deny or forward to the user, or one catch-all function. A call that needs the user makes the agent emit an approval request. The app collects a decision, adds an approval response to the messages and calls the agent again. A denied call goes back to the model as a denial. The UI state is `approval-requested` and the response helper is `addToolApprovalResponse`.

- The approval guides and the 6.0 post show React (`useChat`) only. The shared `useChat` reference lists the helper and lists the Svelte `Chat` import beside the React and Vue ones, but no first-party page shows a Svelte approval UI. Treat Svelte as "probably works, prove it in a spike", not as documented.
- The policy side (`toolApproval`) runs on the server and does not depend on the UI framework. It does not reach everything: subagent tools cannot use it, and provider-executed tools do not use AI SDK approvals.
- A durable agent exists for waits that outlive a process: `WorkflowAgent` is described as surviving restarts, deploys and delayed approvals. It keeps `needsApproval`: the approvals page says to use that option only with `WorkflowAgent`, so the `toolApproval` guidance above does not carry over. A plain agent re-called with the message history holds its pending state in that history, which the client carries unless you store it.
- The AI SDK 7 post says HMAC-signed approvals are opt-in and that replay revalidates tool inputs and policies. The approvals page says the server signs each request when it is issued, verifies on replay and rejects unsigned requests (fail closed); the signature covers tool name, call ID and arguments; the secret needs at least 32 random bytes, must be the same on every server instance and is never sent to the client. Without a secret, approvals behave as before, that is, unsigned. That page names the option `experimental_toolApprovalSecret`; confirm the current name before you write it down.

**AG-UI (protocol pages).** A run can end with `outcome: { type: "interrupt", interrupts: [...] }`. The client resumes by starting a new run whose input carries a `resume` array. Rules from the interrupts page: resume on the same thread; every `resume[].interruptId` must match an open interrupt; one resume must answer all open interrupts, with no partial resumes; new input on a thread with open interrupts must include the resume; replaying the same resume must be safe. Each interrupt has an `id` and a `reason` (`tool_call`, `input_required`, `confirmation`, or a namespaced custom reason) and may carry `responseSchema`, `expiresAt` and metadata. The agent may validate the payload against the schema and answers failures with `RunError`. Microsoft's .NET integration section says its adapter relays approval requests and that tool execution and approval stay part of Agent Framework.

**CopilotKit (vendor pages).** Its human-in-the-loop hook registers a React component as a tool, and it publishes Vue (`useHumanInTheLoop`) and Angular (`registerHumanInTheLoop`) guides as well. The agent emits the tool call, CopilotKit renders the picker, and the user's answer returns as the tool result. CopilotKit's own AgentCore article says the agent "never knows a human was in the middle". That is convenient for choices and dangerous for gates; see the rules below.

## Enforcing approvals on the server

Three pages state the principle. The AG-UI interrupts page says a server that owns a tool must still validate decisions and not trust client-supplied results, and that its `ag-ui:tool-execution` marker is not an authorization credential. The WebMCP page says annotations are hints, not security controls, and that authentication, authorization, validation and required user confirmation belong inside the handler or the API it calls. The AI SDK HMAC feature exists because approvals can be forged.

**Design rule 1.** Treat every approval, resume payload and frontend-tool result as untrusted client input. The browser can send any value.

**Design rule 2.** Never express a gate as a frontend tool whose result the model reads. The model cannot tell a person from a forged result. Express it as an interrupt or approval request that the server issued and recorded.

**Design rule 3.** Run the side effect only on the server, and only after the server finds its own open record that matches the user, the thread, the tool name, the call ID and a hash of the arguments, and has not expired. Consume the record on use so a replay returns the earlier outcome instead of running twice.

**Design rule 4.** Recheck authorization at execute time against the real identity. An approval proves a person clicked; it does not prove that person may do this. The approvals page lists tool name, call ID and arguments as what the signature covers, and lists neither user, thread nor expiry, so add those checks yourself.

**Design rule 5.** Persist pending approvals where a restart cannot lose them, and give them an expiry (AG-UI interrupts have `expiresAt`). Tie the lifetime to the host's request limits; see the hosting traps reference.

**Design rule 6.** Test the negative: send a forged approval, an approval for different arguments, an approval for another user's thread, and a replay. The gate passes only if all four are refused.

## AG-UI on AWS and Azure: contract details that bite

- **AgentCore Runtime** acts as a proxy and passes `InvokeAgentRuntime` requests through unchanged. The container serves port 8080, `/invocations` for HTTP with SSE or `/ws` for WebSocket, and `/ping` for health. The runtime tells AG-UI from plain HTTP by the protocol set on the runtime, since both use the same port and path. Auth is SigV4 or OAuth 2.0, and the request must use the method the runtime was configured with. AWS announced the support on 2026-03-13 for fourteen regions; check the region list for your deployment.
- **Pre-1.0 pins.** AWS's tutorial pins `ag-ui-protocol` to 0.1.19 or later and below 0.2. The events page says the `THINKING_*` events are deprecated and will be removed in 1.0.0, replaced one for one by `REASONING_*`. Check which names your adapter and client emit.
- **Browser to runtime.** CopilotKit's AWS sample puts a server-side bridge (a CopilotKit runtime on Lambda behind API Gateway) between the browser and AgentCore, forwarding the user's token, so the browser never calls the runtime directly. The same article reports that AgentCore replays history on reconnect but drops the tool-call results, and shows a custom runner that supplies empty history for unknown threads and synthesizes the missing results. That is one vendor's sample, not a guarantee, but it shows where a reconnect bug will come from.
- **Foundry hosted agents.** Microsoft says to use the Invocations protocol for AG-UI, because AG-UI is not OpenAI-compatible and needs raw SSE control. The .NET hosting package installs with `--prerelease`.
- **Google ADK.** Google's ADK docs publish an AG-UI integration page, marked supported in Python, TypeScript, Go and Java, and a CopilotKit page that exposes the agent through the `ag-ui-adk` package. CopilotKit runs the agent as its own service behind that bridge. The ADK homepage does not mention AG-UI, so cite the integration pages.
- **Persistence is a product.** Cross-device threads, event replay and reconnect to a live run are, in CopilotKit's words, capabilities of its Intelligence service and not guarantees of the protocol. It is hosted in the vendor's cloud by default; self-hosting is arranged with the vendor. No page checked states a price, licence terms, retention or data regions. Decide the protocol and the vendor product separately.
- **WebMCP.** CopilotKit's WebMCP option is marked experimental and needs Chrome 149 or later with an origin trial or flag. Do not plan on it for production.

## MCP Apps: what is and is not a security boundary

- The host renders the app's HTML in a sandboxed iframe, traffic goes over `postMessage`, and the host decides which capabilities the app gets. The MCP page says this lets a host render third-party apps without fully trusting the server author. Treat the HTML and every tool result it shows as untrusted content.
- An app can call tools through the host. That call is not a user approval. In the AI SDK renderer the host restricts it with an `allowedTools` list; AI SDK 7 also separates model-visible tools from app-only tools.
- The iframe CSP is deny-by-default. The build guide bundles everything into one HTML file for that reason; separate assets need declared CSP origins.
- The MCP page lists eight host products and omits ChatGPT, while OpenAI says ChatGPT implements the standard. Check the current client matrix for the host you need.
- OpenAI's guidance is to build to the standard, use `window.openai` only for ChatGPT-only capabilities, and keep tools useful without UI. Its page says current commerce approval covers physical-goods plugins and the embedded payment sheet is in private beta.
- Hosting an MCP App in your own chat is work: the AI SDK renderer is an experimental React export, and the AI SDK UI table marks Svelte unsupported. The `@mcp-ui/client` React components and the SDK's App Bridge are the options the MCP page names. CopilotKit's MCP Apps page says it fetches and renders the UI component in the chat, and its Angular guide adds `provideMCPApps()`.

## What no page answers

- Whether an existing AI SDK stream can be converted to AG-UI outside the Chat SDK adapter.
- Whether `@ai-sdk/svelte` supports AI SDK 7's approvals and durable agents beyond what the shared reference suggests.
- Any AG-UI version, date or compatibility rule on the pages checked.

## Sources

- https://ai-sdk.dev/docs/agents/tool-approvals
- https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- https://ai-sdk.dev/docs/ai-sdk-ui/overview
- https://vercel.com/blog/ai-sdk-7
- https://vercel.com/blog/ai-sdk-6
- https://docs.ag-ui.com/concepts/events
- https://docs.ag-ui.com/concepts/interrupts
- https://docs.ag-ui.com/introduction
- https://learn.microsoft.com/en-us/agent-framework/integrations/by-component/ui/ag-ui/
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui.html
- https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-bedrock-agentcore-runtime-ag-ui-protocol
- https://www.copilotkit.ai/blog/generative-ui-on-agentcore-with-copilotkit
- https://docs.copilotkit.ai/AG-UI-Streams
- https://docs.copilotkit.ai/webmcp
- https://modelcontextprotocol.io/extensions/apps/overview
- https://modelcontextprotocol.io/extensions/apps/build.md
- https://developers.openai.com/plugins/build/chatgpt-ui
- https://adk.dev/
- https://adk.dev/integrations/ag-ui/
- https://adk.dev/integrations/copilotkit/
- https://ai-sdk.dev/docs/ai-sdk-ui/transport
- https://chat-sdk.dev/adapters/official/web
- https://docs.copilotkit.ai/generative-ui/mcp-apps
- https://docs.copilotkit.ai/vue/human-in-the-loop
- https://docs.copilotkit.ai/angular/human-in-the-loop
- https://docs.copilotkit.ai/angular/generative-ui
