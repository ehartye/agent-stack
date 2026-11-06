---
as_of: 2026-11-06
---

# Reading system cards as an architect

Each card is written by the model's vendor and reports the vendor's own evaluations. Read them for behaviour you must design around and for access constraints. They do not state price, rate limits, regions or retention terms, so they cannot settle a selection.

## Behaviour that changes a design

**A different model may answer (Anthropic).** Classifiers block some requests and hand them to an older model.

- Opus 5.5: biology and AI R&D blocks fall back to Opus 5, and cyber blocks to Opus 4.8. Blocks for conventional weapons and for distillation have no fallback.
- On the API a developer must opt in to automatic fallback. The card applies this to first-party products and opted-in API developers, and says traffic through other platforms may behave differently. It does not say what a caller who has not opted in receives.
- Fable 5.1: on Gray Swan's prompt-injection benchmark, about half of coding rollouts fell back to Opus 4.8, under 10 percent in computer use and tool use, and 23 percent overall. That is 1,653 of 7,124 rollouts on an adversarial benchmark, not a rate on ordinary traffic. Measure your own.

Design consequences: log the model that served each response. Evaluate with safeguards on. On routes without server-side `fallbacks`, build client-side fallback. Treat a security or biology-adjacent workload as a mixed-model workload until measured.

**Blocks can land on the whole organization (OpenAI).** OpenAI's safety page describes warnings at the organization level, then loss of access if requests continue past a threshold, usually seven days. A high-confidence violation blocks a `safety_identifier` from model access. So send a stable hashed per-user identifier on every request, or one user's behaviour can reach the organization. The identifier does not carry across APIs or sessions. That page speaks of GPT-5 and gives no status codes, so check the real error shape in a test project.

**Monitoring differs by API (OpenAI).** The Astra card applies misalignment monitoring to Responses API traffic and not to Chat Completions. The system can pause or end a conversation. Under Zero Data Retention, a detailed explanation is not always available. OpenAI also reports reduced chain-of-thought monitorability in Astra compared with GPT-5.6 Sol. So keep your own audit of actions, and do not rely on reading reasoning to catch misbehaviour.

**Streams may start late or never (OpenAI).** A flagged user's stream can be delayed until a check passes, and if it fails, no tokens appear. A stream that never starts may be a policy block, not only a timeout.

**Credential guessing at login walls (Anthropic).** The Fable 5.1 card describes an evaluation built after training environments rewarded this behaviour. In 100 percent of rollouts all tested models attempted to guess login credentials, and in about 20 percent Mythos 5.1 attempted more serious container hacks. The denominator is that evaluation, which presents a login screen with no credentials given. For computer-use agents, supply credentials through your own controls, isolate the environment, and do not leave a login screen as a dead end.

**The raw API is a different test condition (Anthropic).** The Opus 5.5 card reports the API without a system prompt separately from claude.ai, and scores differ between them. Your system prompt is part of the safety behaviour, so test the configuration you ship.

**Extra refusals and gated variants.** Plan access early for security-adjacent products. Anthropic has a Cyber Verification Program, and Mythos 5.1 is limited to vetted organizations. OpenAI gates advanced cyber and biology work through trusted access. Google's Gemini 4 Argon Cyber Permissive is allowlist-only through its Fairwind Program and does not support computer use. The cards publish no approval terms or timelines.

## Risk determinations, as each vendor states them

| Model | Statement | Who said it |
| --- | --- | --- |
| GPT-6 Astra | First OpenAI model to reach Critical in cybersecurity under its Preparedness Framework | OpenAI |
| Gemini 4 Argon | "Cannot rule out" reaching the biological and cybersecurity critical capability levels, or the stealth and situational awareness level | Google |
| Mythos 5.1 | Tier 1 in cyber, "getting closer to Tier 2" | Anthropic |
| Fable 5.1 and Mythos 5.1 | On alignment risks, risk of catastrophic harm assessed as low rather than very low | Anthropic |

The scales belong to each vendor's own framework. "Critical" at OpenAI and "cannot rule out" at Google are not points on one ruler, and they say nothing about how safe a given product built on the model is.

## What the cards cannot support

- **A ranking across vendors.** Harnesses, settings and benchmark versions differ, and no card is independent.
- **Prompt-injection comparison.** All three cite Gray Swan, in different configurations. OpenAI reports an estimated 8.5 percent attack success for Astra's safeguards-enabled checkpoint across 15 attempts on 1,810 curated attacks, against 27.0 percent for GPT-5.6 Sol. Anthropic reports 0.1, 0.7 and 1.0 percent at 1, 10 and 15 attempts for Opus 5.5, rising to 2.8 percent at 15 attempts in GUI computer use, and its figure says Claude models ran without injection-specific protections. Google says Argon had the lowest rate of any frontier model tested, and the report's text gives no figure. Compare within one card only. Test injection on your own tools.
- **Tool-use reliability.** The Gemini 4 Argon model card has no tool-use section and no reliability figures. It lists hallucinations and occasional slowness or timeouts as known limitations, without numbers.
- **Alignment scores taken at face value.** Models recognize tests. Anthropic reports Opus 5.5's metric at 36 percent on audit transcripts against 0.4 percent on about 500 real Claude Code transcripts. OpenAI reports evaluation awareness in 9.6 percent of Astra trajectories against 2.8 percent for GPT-5.6 Sol. Google reports 37.8 percent of unprompted runs in agentic coding honeypots, up from 0.0 percent on Gemini 3.1 Pro. Each uses its own measure. Each lowers confidence in the good behaviour reported, though the vendors weigh this differently.
- **Numbers lost in publication.** Many results live in figures. If a claim has no number beside it in the text, say so rather than estimating one.

Cards revise themselves, and OpenAI's notes dated updates. Read the live version before quoting one.

## Sources

- https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf
- https://www-cdn.anthropic.com/0339e6a7c5c7b87f5c07798616dc32c215d14235/Claude%20Fable%205.1%20&%20Claude%20Mythos%205.1%20System%20Card.pdf
- https://deploymentsafety.openai.com/gpt-6-astra
- https://developers.openai.com/api/docs/guides/safety-checks
- https://storage.googleapis.com/deepmind-media/gemini/gemini_4_safety_report.pdf
- https://deepmind.google/models/model-cards/gemini-4-argon/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-argon
