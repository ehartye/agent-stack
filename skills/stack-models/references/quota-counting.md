---
as_of: 2026-11-06
---

# How quota counting differs by route

"Tokens per minute" means something different on each route. A sizing built on one route's rules is wrong on another, and the error can be an order of magnitude. Numbers are published defaults on the date above. The account's own values decide.

## What each route counts

| Route | Input | Cache writes | Cache reads | Output | `max_tokens` |
| --- | --- | --- | --- | --- | --- |
| Claude API, Claude Platform on AWS | Own ITPM bucket, uncached only | Count | Do not count | Own OTPM bucket, actual tokens | Not counted |
| Foundry, both hostings, by subscription type | Own ITPM bucket, uncached only | Count | Do not count | Own OTPM bucket | Not stated |
| Bedrock `bedrock-runtime` | One combined TPM | Count | Do not count | Actual output times a multiplier | Deducted up front with input |
| Bedrock `bedrock-mantle` | Own input TPM | Not stated; the engine counts them | AWS says cache reads are not deducted | Own output TPM; no multiplier, inferred from the separate rows | Not stated |
| OpenAI API | One TPM, the larger of `max_tokens` and an estimate from request length | Not stated | Not stated | Not stated | Counted |
| Azure OpenAI | One TPM with an RPM | Not stated | Not stated | Not stated | Not stated |
| Gemini API | TPM is input tokens | Not stated | Not stated | Not stated | Not stated |
| Gemini on Google Cloud | Org-level threshold, not a hard cap | Not stated | Not stated | Not stated | Not stated |

AWS's multipliers: 10x for Opus 5.5, Sonnet 5, Opus 5 and Fable 5.1; 15x for version 4.8; 5x for 4.7 and below; 10x for GPT-5.6 on runtime. The model cards add 10x for all five GPT-6 and 6.1 models on runtime, worded variously as "10x", "10-to-1" and "burndown rate is 10", so search for all three when checking a new card. Neither the token page nor the model cards name one for Sonnet 5.5, Haiku 5.5, Fable 5 or Mythos, and AWS's catch-all reads 1:1 unless the card says otherwise. Bound those with `--assume-multiplier 1` and `10`.

## Worked example

200 agents, 150,000 context tokens per turn, one turn every 30 seconds, 1,500 output tokens per turn, `max_tokens` 8,000, 85 percent cache reads, 5 percent cache writes.

- Turns per minute: 200 x 60 / 30 = 400.
- Per turn: 127,500 cache read, 7,500 cache write, 15,000 uncached, so 22,500 counted input.

Opus 5.5, the same model and the same workload, on four routes:

| Route | Calculation | Against | Share |
| --- | --- | --- | --- |
| Claude API, input | 22,500 x 400 = 9,000,000 | 2,000,000 ITPM | 450% |
| Claude API, output | 1,500 x 400 = 600,000 | 400,000 OTPM | 150% |
| Bedrock runtime, settled | (22,500 + 1,500 x 10) x 400 = 15,000,000 | 30,000,000 TPM | 50% |
| Bedrock runtime, reserved | (22,500 + 8,000) x 400 = 12,200,000 | 30,000,000 TPM | 41% |
| Bedrock runtime, per day, per Region, approximate | 15,000,000 x 1,440 = 21.6 billion | 700,000,000 | ~31 times over, advisory |
| Bedrock mantle, input, if cache writes count | 22,500 x 400 = 9,000,000 | 20,000,000 | 45% |
| Bedrock mantle, output | 600,000 | 2,000,000 | 30% |
| Foundry Pay-as-you-go, input | 9,000,000 | 40,000 ITPM | 22,500% |
| Foundry Pay-as-you-go, output | 600,000 | 8,000 OTPM | 7,500% |
| Foundry Pay-as-you-go, requests | 400 | 40 RPM | 1,000% |
| Foundry Enterprise and MCA-E, input | 9,000,000 | 10,000,000 ITPM | 90% |
| Foundry Enterprise and MCA-E, output | 600,000 | 2,000,000 OTPM | 30% |
| Foundry Enterprise and MCA-E, requests | 400 | 10,000 RPM | 4% |

What this shows:

- **Caching decides the Bedrock number.** With no caching the runtime settled figure is (150,000 + 15,000) x 400 = 66,000,000, or 220 percent.
- **`max_tokens` can bind before real use does.** At 128,000 the reservation is (22,500 + 128,000) x 400 = 60,200,000, about 201 percent, while settled use stays at 50 percent. AWS's own example deducts 36,000 up front against 9,000 final. Set `max_tokens` near real output on runtime. On the Claude API it costs nothing against limits.
- **The daily row warns when per-minute rows fit.** AWS's Cross-Model Max Tokens Per Day row is 700,000,000 per Region, roughly 486,000 tokens per minute averaged over a day, and this workload passes it in about the first hour. The engine prints it with a `~` and it never sets status. AWS's token page shows burned-down tokens depleting the daily quota, yet the row says its count is "estimated based on on-demand pricing" and varies by model, input/output ratio and cache usage, so the figure is only a rough scale. The row names no model list, and no page says whether `bedrock-mantle` traffic counts. Run again with `--duty-cycle`. AWS marks it not adjustable yet accepts requests through a limit-increase form. Raise it with AWS before believing either a pass or a failure.
- **Foundry defaults depend on subscription type, so pass `--tier`.** On Pay-as-you-go, one turn of this size is more than half of 40,000 ITPM, and a single agent at this pace is already over it, at 45,000 ITPM. On Enterprise and MCA-E the whole workload fits, tight at 90 percent of input. Free Trial is zero throughout, and Microsoft's hosting page lists free trials as unsupported for Claude. Fable 5.1 is zero on Pay-as-you-go and 4,000,000 ITPM on Enterprise and MCA-E. More regions or resources add nothing inside a pool, which Microsoft scopes to model and version, with Data Zone separate per zone.
- **The cross-Region row is not the only row.** Opus 5.5's In-Region on-demand row is 15,000,000 and marked not adjustable, and AWS's model card lists In-Region on runtime only in eu-west-2. Sizing a single-Region design against 30,000,000 is wrong.

## Reading the tiered results for OpenAI and Azure OpenAI

**OpenAI API.** The limit counts the larger of `max_tokens` and an estimate from request length, and the page does not say whether cached input is excluded. So take a range. For the workload above:

- Cached input counts: 150,000 x 400 = 60,000,000 TPM.
- Cached input excluded: 22,500 x 400 = 9,000,000 TPM.

Against Astra, Sol and Terra's published 1,000,000 (Build), 4,000,000 (Launch) and 40,000,000 (Grow), this is over on Build and Launch either way, and depends on the unstated rule on Grow. Measure one real request against the `x-ratelimit-*` headers to settle it. Some model families share a limit, and tiers carry monthly usage limits too.

**Azure OpenAI.** Tiers 1 to 6 give GPT-6 and 6.1 models the same numbers. Global Standard runs from 250 RPM and 250,000 TPM at Tier 1 to 15,000 and 15,000,000 at Tier 6. Data Zone runs from 100 and 100,000 to 5,000 and 5,000,000. Here 400 RPM clears from Tier 2 Global Standard up. On tokens, 60,000,000 exceeds every tier, so the engine reports that no listed tier fits, and 9,000,000 would first fit at Tier 5 Global Standard if cached input were excluded, which Microsoft does not state. Microsoft assigns the tier, so read yours on the Foundry Quota page and pass `--tier`. It describes subscription-level pooling as starting with two Realtime models "and soon all models". It warns of 429s even when usage metrics look below quota.

**Gemini on Google Cloud.** Standard PayGo thresholds rise with 30-day organization spend: Argon 500,000 to 10,000,000 TPM, Flash 2,000,000 to 50,000,000. They are not caps. Above the threshold, traffic is served when spare capacity exists and is throttled first. So a fit here is a statement about priority, not about guaranteed service. Thresholds apply on `global`. The `us` and `eu` endpoints use separate pools, and single-region has the least headroom, so a residency choice also changes capacity.

**Google-managed Claude and Anthropic-managed Claude.** No numbers on the pages checked. The Gemini PayGo tables do not apply to Claude. Read Google's Claude quota page or the Claude Console for that organization.

## Limits that are not per-minute

- **Anthropic spend caps.** Start, Build and Scale carry monthly caps of 500, 1,000 and 200,000 USD. Reaching one returns 429 until the next month and retrying does nothing. Claude Platform on AWS starts on Start and can move up automatically with a history of paid AWS Marketplace invoices; otherwise tier increases go through the account representative. A workload that fits per-minute limits can still stop on the fourth day of the month.
- **Burst enforcement.** Anthropic notes 60 RPM may be enforced as 1 per second. Google says high instantaneous traffic can throttle within the per-minute threshold.
- **Ramp rate.** OpenAI returns `429 slow_down` when traffic rises too fast, even inside limits.

## The same 429 means different things

| Vendor | 429 can mean | Action |
| --- | --- | --- |
| Anthropic | Rate limit | Wait `retry-after` |
| Anthropic | Monthly spend cap, code in `error.details` | Stop; only a tier change helps |
| OpenAI | `slow_down`, ramp too fast | Reduce, then increase gradually |
| OpenAI | Quota or billing | Do not retry |
| Google Cloud, Gemini | Contention on a shared pool, not a spent quota | Back off, prefer `global`, smooth traffic |
| Gemini API | Spend limiter, `RESOURCE_EXHAUSTED` | Check spend and tier |

## Buying predictable capacity

- **Bedrock Reserved tier:** 1 or 3 months, minimum 100,000 input and 10,000 output TPM, through the account team, overflow to Standard. Sizing counts input plus cache writes. AWS's model cards mark Reserved, Priority and Flex not supported on Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1, and on GPT-6 Sol and Luna, so check the card for your model before planning on this.
- **Foundry provisioned throughput:** region-specific, and quota does not guarantee capacity. The page does not say any Claude model can be provisioned.
- **Google Provisioned Throughput:** fixed-term per model and location. See the conflict about endpoints in [route-traps.md](route-traps.md).
- **OpenAI Scale and Reserved tiers, Anthropic Priority Tier:** named on the rate-limit pages without terms. Ask the vendor.

## Sources

- https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-token-burndown.html
- https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/service-tiers-inference.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-fable-5-1.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-astra.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-sol.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-luna.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-1-sol.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-1-terra.html
- https://platform.claude.com/docs/en/api/rate-limits
- https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models-quotas-limits
- https://learn.microsoft.com/en-us/azure/foundry/openai/quotas-limits
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/quotas-limits
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput
- https://developers.openai.com/api/docs/guides/rate-limits
- https://aistudio.google.com/docs/rate-limits
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/standard-paygo.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/priority-paygo.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/provisioned-throughput.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/anthropic-managed.md.txt
