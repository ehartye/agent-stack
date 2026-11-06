---
as_of: 2026-11-06
---

# Route traps and vendor conflicts

Every statement here is a vendor describing its own product, read on the date above. None is a test or legal advice. Use `facts` for one option's values; this file holds what the table cannot show.

## Sentences that mislead

**"No data retention change to Claude models released before Claude Fable 5" (AWS).** It covers less than it seems to. Release dates from Anthropic's notes: Fable 5 on 2026-06-09, Sonnet 5 on 2026-06-30, Fable 5.1 on 2026-09-01, Opus 5.5 on 2026-09-22, Sonnet 5.5 on 2026-09-28, Haiku 5.5 on 2026-10-07. Every current 5.5 model came after Fable 5, so the sentence says nothing about them. What does cover them is AWS's pointer to its abuse-detection page as the full list of models requiring retention. That page names OpenAI models and Fable 5 and 5.1. So Opus 5.5 rests on absence from a list, and the check is the model's `allowed_modes`, read from `GET /v1/models/{model}` on the mantle endpoint. AWS says the control plane exposes no per-model signal.

**"Available on all platforms" (Anthropic's Opus 5.5 launch).** Available does not mean equal. On Bedrock and Google-managed, server tools, Files, Batches, Agent Skills and Managed Agents drop out or narrow. Anthropic also marks Opus 5.5, Sonnet 5.5 and Haiku 5.5 access on Bedrock as "See Access", pointing to the AWS console.

**"Open to all Amazon Bedrock customers" (Anthropic, about Fable 5.1).** AWS makes it unavailable unless the account or project is at `aws_review` or the legacy `provider_data_share`. "Open" means no approval list, not no precondition.

**"Default quota is 2 million input tokens per minute" (Anthropic's Bedrock page).** It names no model. AWS's table gives Opus 5.5 20,000,000 input on mantle and Fable 5.1 5,000,000. Use AWS's row.

## Retention

**On Bedrock the mode is a ceiling.** It states the most retention you accept, not what each request gets. Setting `aws_review` does not make a model that permits `none` start retaining. AWS orders them `none` < `default` < `aws_review` < `provider_data_share`.

**Set it per Region, per endpoint.** New accounts sit at `inherit`. The mode does not propagate across Regions. It is evaluated in the source Region, while retained data sits in the destination Region. `bedrock-runtime` has no project scope, so isolating workloads there means separate accounts. Organization policies do not bind the management account.

**Enterprise Frontier Safeguards has a date.** AWS states ZDR for eligible customers on Fable 5 and 5.1 through 2026-12-31, for internal use. After that, all traffic is retained up to 30 days. AWS says the program plans customer-managed keys and your own bucket for that storage, so retention moves rather than ends. Do not design past that date on this exception without written terms.

**ZDR ends at stateful features, at every vendor.**
- Anthropic: Message Batches (29 days), Files API, MCP connector, code execution, programmatic tool calling, Agent Skills and Managed Agents are not eligible. Under ZDR the API does not block them, so using one silently steps outside the arrangement for that data. Under HIPAA readiness, the same features return 400.
- OpenAI: `/v1/batches`, `/v1/files`, `/v1/agents` and `/v1/conversations` are not eligible. Background mode under ZDR still writes response data to disk for roughly 10 minutes.
- Google Cloud: no single switch. Search grounding (3 days), Maps grounding (30 days) and Deep Research (7 days) cannot be turned off. For search, Google recommends Web Grounding for Enterprise when zero retention is required. Interactions stores by default until `store=false`.
- Gemini API: Google tells workloads needing guaranteed zero retention to use Google Cloud instead. The same API name stores Interactions 55 days on the paid tier here and 7 days on Google Cloud.

So a batch discount and strict ZDR conflict for the same data at both Anthropic and OpenAI.

**Other collisions.** A ZDR organization cannot call the Claude API from a browser. CMEK and ZDR cannot share a workspace on Claude Platform. HIPAA readiness is permanent once enabled and is not on Claude Platform on AWS. Claude Platform on AWS and Anthropic-managed Claude each create a new Anthropic organization, so an existing ZDR or HIPAA arrangement does not carry over. Flagged Claude content may be kept up to 2 years under any arrangement. AWS's abuse page says it may store and review apparent CSAM in image inputs or outputs and names no mode, while its retention page says `none` writes nothing durable, so reading the first as applying at `none` is an inference.

## Who processes the data

| Route | Inference operator | Data processor |
| --- | --- | --- |
| Claude API, Claude Platform on AWS | Anthropic | Anthropic |
| Foundry Hosted on Azure | Anthropic, on Azure infrastructure | Anthropic |
| Foundry Hosted on Anthropic | Anthropic, may leave Azure | Anthropic |
| Bedrock | AWS | AWS |
| Google-managed | Google | Google, with the Fable conflict below |
| Anthropic-managed on Google Cloud | Anthropic, may route outside Google Cloud | Anthropic and Google separately |

Billing through a cloud does not make that cloud the processor. Claude Platform on AWS workspaces created before 2026-09-18 might process outside AWS.

## Features that fail at request time

- **Forced tool choice.** `tool_choice` of `any` or `tool` returns 400 on Opus 5.5, Fable 5.1 and Mythos 5.1 (AWS, Anthropic) and on Sonnet 5.5 (Anthropic, and AWS's model card lists `auto` and `none` only). Use `auto` with strict tool use.
- **Thinking.** On Opus 5.5, `thinking: {"type": "disabled"}` returns 400. On Sonnet 5.5, use `between_tools` instead.
- **Hosted on Azure.** Code execution, later web tool versions, Agent Skills, programmatic tool calling and the Files API return 400 by design. Microsoft's table separates `/files` and `/skills` but does not itemise code execution, programmatic tool calling or tool versions, so sizing features from it overstates this option.
- **OpenAI tool calling.** Astra, 6.1 Sol and 6.1 Terra need the Responses API for tools. GPT-6 Sol and Luna allow it in Chat Completions only at `reasoning_effort: none`.
- **OpenAI on Bedrock.** No async tool calls, mid-turn steering, WebSockets, Pro mode, programmatic tool calling or remote MCP. Hosted web search is Mantle only. Runtime needs `model` on every request.
- **Server-side fallback.** The `fallbacks` parameter is in beta on the Claude API and Anthropic-managed Claude only. It is unsupported on Bedrock, Foundry and Google-managed, and Anthropic's fallback page does not name Claude Platform on AWS, so build client-side fallback there. Haiku 5.5 has no server-side fallback on any route.
- **Argon.** Explicit caching is gone, `temperature`, `top_p` and `top_k` are ignored, and Google asks for client timeouts of at least 15 minutes. A previous request is cached in full only if the new one adds at least 2,050 tokens.
- **Remote MCP is not portable.** Claude's connector requires a publicly exposed HTTPS server. Anthropic lists MCP tunnels as a separate research preview, not eligible for ZDR or HIPAA and not available on Claude Platform on AWS. OpenAI adds a private tunnel. The Gemini API documents Streamable HTTP only, with SSE unsupported. A design that must span vendors runs its own MCP client and exposes tools as functions. This is a reading of the pages, not a vendor statement.

## Lifecycle is per route

Anthropic's floor for Fable 5.1 is not sooner than 2027-09-01. Google's page for the same model says no sooner than 2027-03-01. Foundry follows Anthropic's schedule, while Bedrock and Google set their own. Read the operator's date for the route you pick.

## Open conflicts

Neither side is resolved by a third source. Treat each as something to test or ask.

| Question | One side | Other side | Do this |
| --- | --- | --- | --- |
| Sonnet 5.5 in a US data zone on Foundry | Anthropic: Global Standard only | Microsoft's quota table has a Data Zone (US) row | Try to deploy it in the portal |
| Single-region Claude on Google-managed | Anthropic: Sonnet 4.6 and earlier only | Google's residency table ticks Singapore for Opus 5.5, Sonnet 5.5 and Fable 5.1; Google says a tick marks the processing boundary, not the endpoint type | Ask Google for the endpoint |
| Provisioned throughput endpoint on Google-managed | Anthropic: needs a regional endpoint | Google's model pages list it on multi-region and global | Ask Google before buying |
| Fable 5.1 data on Google-managed | Anthropic: retained data stays in the cloud provider's environment | Google requires enabling prompt-response sharing with Anthropic per location | Read Section F of Anthropic's service terms and Google's logging page |
| Provider sharing on Bedrock | AWS's July 2026 post: Fable 5 requires data sharing with the provider | Current AWS docs: content sharing is not supported today, and that mode is legacy | Trust the docs and confirm in writing |
| Mythos on Bedrock | Anthropic: 30-day rule wherever offered | AWS lists only Fable 5 and 5.1 as requiring `aws_review` | Read `allowed_modes` after verification |
| Mythos on Google-managed | Anthropic's page lists `claude-mythos-5-1` | Google's Claude catalog does not | Ask during verification |
| OpenAI on Bedrock at mode `none` | AWS retention page and OpenAI: nothing durable is written | AWS abuse page: flagged traffic kept up to 30 days unless full ZDR is granted | Ask the AWS account team |
| Requests per minute on Bedrock | Anthropic: AWS enforces RPM limits | AWS prints no RPM row for current Claude or GPT-6 models | Read Service Quotas |
| Claude Regions on `bedrock-mantle` | Anthropic: many Regions, a global endpoint, and US, EU, JP and AU profiles | AWS's model cards: In-Region only, with no Geo or Global ID. Opus 5.5 in us-east-1, ap-southeast-4 and us-gov-west-1; Sonnet 5.5, Haiku 5.5 and Fable 5.1 in us-gov-west-1 | Call `GET /v1/models` in the target Region |
| Remote MCP on Gemini 3.8 Flash | Function-calling page documents `mcp_server` with Flash samples | Interactions overview: Gemini 3 does not support it, coming soon | Test on a real server |
| Anthropic ordinary retention | Retention page: not retained by default | CMEK page: non-ZDR workspace is "Standard data retention (30 days)" | Read the commercial policy or the contract |

## Sources

- https://platform.claude.com/docs/en/release-notes/overview
- https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- https://platform.claude.com/docs/en/manage-claude/cmek-data-retention
- https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
- https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback
- https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
- https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
- https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/google-managed
- https://platform.claude.com/docs/en/about-claude/model-deprecations
- https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- https://www.anthropic.com/claude-opus-5-5
- https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html
- https://aws.amazon.com/blogs/security/enforce-zero-data-retention-on-amazon-bedrock-with-bedrock-projects-and-service-control-policies/
- https://aws.amazon.com/blogs/machine-learning/introducing-claude-fable-5-1-on-aws/
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-tool-use.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-fable-5-1.html
- https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- https://developers.openai.com/api/docs/guides/amazon-bedrock.md
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/background
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/interactions.md.txt
- https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models-hosting-comparison
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models-quotas-limits
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-claude
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/anthropic-managed.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/fable-5-1.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention.md.txt
- https://aistudio.google.com/docs/zdr
- https://aistudio.google.com/docs/interactions-overview
- https://aistudio.google.com/docs/function-calling
- https://aistudio.google.com/docs/latest-model
