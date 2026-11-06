---
as_of: 2026-11-06
---

# Watch list: why only three stacks are admitted

Read this when a user asks for a fourth option (Angular, Vue, Astro, TanStack Start, a chat kit) or asks why the plugin does not rank it. The plugin keeps at most three cutting-edge frontend stacks: Next.js with the AI SDK, SvelteKit with the AI SDK Svelte bindings, and the protocol-led layer (AG-UI with CopilotKit, MCP Apps) that sits on top of a framework. A longer list would mean ranking options whose facts nobody has checked on vendor pages.

## Admission rule

A stack is admitted only when all of these hold on first-party pages, read on the date of the fact set:

1. A documented streaming chat path for the stack.
2. A documented human-approval path for tool calls, with the UI state named.
3. A way to render app-owned components from tool calls.
4. A release in the last twelve months, with a migration path.
5. Enough independent signal (a survey, a public adoption figure with units) to say something other than "the vendor says so".

Adding a stack means adding its facts to the data file with sources first. Removing one means a replacement or a reason on the record.

## Candidates and why they are not admitted

| Candidate | What the checked pages show | Why not admitted |
| --- | --- | --- |
| Angular | The AI SDK UI overview lists an Angular binding with Chat, Completion and StructuredObject, and MCP Apps unsupported. CopilotKit publishes Angular guides for generative UI (including `provideMCPApps()`) and human-in-the-loop. | Through the AI SDK, no first-party page shows Angular approvals or generative UI, so conditions 2 and 3 fail. Through CopilotKit it is stack 3 on a different host framework, not a fourth stack. Record the host framework in the decision. |
| Vue and Nuxt | The AI SDK 7 migration guide has a Vue section: the `Chat` class is replaced by a `useChat` composable. The UI table marks MCP Apps unsupported. CopilotKit publishes a Vue quickstart with a chat UI, components as tools (`useComponent`) and human-in-the-loop (`useHumanInTheLoop`). | Same split as Angular: no AI SDK page shows Vue approvals or generative UI, and the CopilotKit route is stack 3 on a different host framework. |
| SolidJS | The AI SDK UI overview marks it a community project. | Not first-party. |
| TanStack Start | Absent from the State of JS 2025 options because it was not out of beta at launch; write-ins suggest a strong entry next year. CopilotKit's quickstart names it as a React host, so it can carry the protocol layer. | No AI-specific first-party evidence. Revisit when the next survey rates it. |
| Astro | Top satisfaction in the State of JS 2025 meta-framework page, described there in static-site terms. | No AI evidence on the pages checked. The survey signal is real but not about this use. |
| A2UI | AG-UI's table lists it as a supported generative-UI spec and calls it quite different from AG-UI. | No A2UI primary page was read. A spec named by a neighbour is not evidence. |
| OpenAI ChatKit | Microsoft's Agent Framework 1.0 post names ChatKit next to CopilotKit as an adapter target. | No ChatKit page was read. |
| React single-page app with CopilotKit on Vite or TanStack Start | CopilotKit's quickstart names Vite and other React hosts. | It is stack 3 on a different host framework, so it is not a fourth stack. Record the host framework in the decision. |

## What would change the list

- A first-party AI SDK approval guide for Svelte, Vue or Angular, with the UI state named. Svelte would then move from `conditional` to `yes` on `tool_approval` in the data file.
- AI SDK 7 migration notes for the Svelte package, or a Svelte generative-UI guide.
- A CopilotKit guide for Svelte. Its React, Vue and Angular guides exist; no page documents a Svelte client.
- The next State of JS results, if they rate TanStack Start or give usable SvelteKit figures.
- Next.js 17 shipping with Cache Components as the default, which the 16.4 post announces without a date.

## Sources

- https://ai-sdk.dev/docs/ai-sdk-ui/overview
- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://docs.copilotkit.ai
- https://docs.copilotkit.ai/quickstart
- https://docs.copilotkit.ai/webmcp
- https://docs.copilotkit.ai/vue
- https://docs.copilotkit.ai/vue/generative-ui/tool-based
- https://docs.copilotkit.ai/vue/human-in-the-loop
- https://docs.copilotkit.ai/angular/generative-ui
- https://docs.copilotkit.ai/angular/human-in-the-loop
- https://docs.ag-ui.com/introduction
- https://2025.stateofjs.com/en-US/libraries/meta-frameworks/
- https://2025.stateofjs.com/en-US/libraries/front-end-frameworks/
- https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/
- https://nextjs.org/blog/next-16-4
