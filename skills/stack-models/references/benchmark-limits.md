---
as_of: 2026-11-06
---

# Benchmark limits and running a bake-off

Published scores can build a shortlist. They cannot choose, and the evidence for that comes from the vendors' own tables.

## The same benchmark, different numbers

Anthropic's Opus 5.5 launch table and Google's Argon model card print scores for the same named benchmarks.

| Benchmark | Model | Anthropic's table | Google's table |
| --- | --- | --- | --- |
| AutomationBench | Opus 5.5 | 40.0% | 42.5% |
| Terminal-Bench 4.0 | GPT-6 Astra | 57.9% | 58.2% |
| Terminal-Bench 4.0 | Fable 5.1 | 55.8% | 57.9% |
| Terminal-Bench-Science 0.1 | Opus 5.5 | 58.7% | 63.3% |
| Terminal-Bench-Science 0.1 | GPT-6 Astra | 64.6% | 68.1% |
| Chartography | Opus 5.5 | 89.0% (with tools) | 66.3% |
| Chartography | Fable 5.1 | 88.4% (with tools) | 46.2% |

Settings explain part of this, and the tables do not reconcile it. Chartography differs by more than the whole spread between models. Each table also favours its author: Opus 5.5 leads most rows in Anthropic's, and Argon leads 13 of 19 rows and ties one in Google's. Neither is independent. Anthropic's table mixes its own runs, figures "as reported by OpenAI", and Zapier's runs.

**Safeguards can move a score.** Anthropic notes that AutomationBench ran without fallback models, so safeguard interventions counted as failures. A score tells you little until you know whether production safeguards were on.

## Noise is as large as the gaps

- Anthropic measured a 6 percentage point gap on Terminal-Bench 2.0 between its most and least resourced setups (p < 0.01), purely from infrastructure, and says leaderboard leaders are often separated by less. This is one vendor's internal experiment.
- Anthropic prints standard errors of about 2.6 points for Opus 5.5 on Terminal-Bench 4.0 and 3.5 to 5 points on Terminal-Bench-Science. Margins smaller than that are not differences.
- Anthropic itself writes that benchmark margins "have become a less reliable guide to real-world differences".
- Most leaderboards score single attempts. Opper ran one simple logic question ten times, and 5 of 53 models passed all ten. Opper sells a gateway and says so, and this was one question.

## Who built it, and which version

- **Ask who funds it and who sees the answers.** Opper recounts that FrontierMath's funding by OpenAI and OpenAI's access to problems came to light only in December 2024. Epoch said it made a mistake and maintains a holdout set.
- **Versions are not comparable.** Artificial Analysis says scores across some evaluation versions are not comparable, and that its and Surge's results on one shared task set are not directly comparable. Its index is v5.0.1 at this date, so record the version with any score. Its independence is its own claim.
- **A rank is not a criterion.** Microsoft's selection guide lists cultural popularity and the publisher as things not to decide on, and tells readers to consult several benchmarks and then run candidates on the same representative data.

## Running the bake-off

1. **Test the route you will ship.** Features, safeguards and quotas differ by route, so a direct API test does not predict Bedrock behaviour. Keep safeguards and fallbacks as they will run in production.
2. **Use the customer's tasks and fix the pass bar first.** Write the pass condition before seeing results. Hold back some tasks that are never used for prompt tuning.
3. **Tune each model before comparing.** Compare each at its best effort or reasoning level. Anthropic calls tuning effort often a better lever than switching models. Google advises evaluating Argon at all three thinking levels. Run effort levels in separate sessions, because changing effort invalidates a Claude prompt cache.
4. **Measure cost per completed task, not per token.** Anthropic says the same text costs about 30 percent more tokens on Claude 4.7 and later, so a per-token comparison misleads by construction. Include retries, cache reads and writes, and fallback traffic.
5. **Read prices on the day.** Use the vendor's page and record the date. Prices move on stated dates: Google's page prints rises for Argon and Flash within weeks of this writing, so budget the later rate. Residency options, batch and fast tiers change the rate too. Third-party price tables go stale, so do not use them.
6. **Give the sample enough size.** A pass rate near 70 percent over 100 tasks has a standard error near 4.6 points, so a 5-point gap between two models is not a finding. Run both on the same tasks and compare per task, and repeat runs where outcomes vary.
7. **Count refusals and fallbacks as outcomes.** Record refusal rate, which model served each response, tail latency, and timeouts. A model that wins on average but refuses a tenth of your domain has not won.
8. **Record what would change the decision.** Name the result that would flip the choice. Keep the task set, because current retirement floors sit about a year out or less and the next migration needs the same run.

Vendor numbers are inputs to step 2 at most. Report any you cite with who ran it and on what.

## Vendor price pages

- https://platform.claude.com/docs/en/about-claude/pricing
- https://developers.openai.com/api/docs/pricing
- https://aistudio.google.com/docs/pricing
- https://aws.amazon.com/bedrock/pricing/
- https://azure.microsoft.com/pricing/details/azure-openai/
- https://cloud.google.com/vertex-ai/generative-ai/pricing

## Sources

- https://www.anthropic.com/claude-opus-5-5
- https://deepmind.google/models/model-cards/gemini-4-argon/
- https://www.anthropic.com/engineering/infrastructure-noise
- https://opper.ai/blog/llm-rankings-explained
- https://artificialanalysis.ai/methodology/intelligence-benchmarking
- https://learn.microsoft.com/azure/architecture/ai-ml/guide/choose-ai-model
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
- https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence
- https://aistudio.google.com/docs/latest-model
- https://aistudio.google.com/docs/pricing
