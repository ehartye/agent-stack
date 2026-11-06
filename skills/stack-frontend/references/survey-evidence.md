---
as_of: 2026-11-06
---

# The survey evidence and its limits

Read this before you cite the State of JavaScript 2025 survey in a decision record, or when someone asks for popularity or satisfaction data on a framework. The survey is the only independent evidence on these stacks in the data set. It is thin, partial and not about AI, and the record should say so.

## What the two pages say

Both pages are the survey's own commentary. The prose reads cleanly; the chart values could not be read reliably here.

**Meta-frameworks.**
- Next.js "keeps on gaining ground and dominating the meta-framework category", yet is "losing satisfaction at the exact same time". Its satisfaction ratio has a 39% gap to Astro, the leader. The page calls this "not a good sign".
- "Next.js issues" ranks second among meta-framework pain points, behind cognitive overload, in the chart's view of items outside "limitations". The ranking is of pain-point topics, so a framework name appearing in it means it was raised often, not that it fails more than others; the published pages reviewed give no method for how topics were grouped.
- The page's own caution: diminishing Next.js satisfaction has not so far reduced meta-framework happiness overall.
- Astro has the top satisfaction ranking. The page frames Astro in terms of static site generators.
- TanStack Start is missing from the official options only because it was not out of beta at survey launch. Write-in answers suggest it will enter the official rankings strongly next year.

**Front-end frameworks.**
- The prose says React tops the list of things front-end developers struggle with, which it ties to React's dominance. The ranked topics on the same page start with cognitive overload and show no React row, so quote the sentence and not a rank.
- Solid is used by about 10% of respondents and has had the highest satisfaction for five years running.
- Usage rankings were stable year on year, with only Alpine.js and HTMX swapping places. The average respondent has used 2.6 front-end frameworks.

## What the survey cannot tell you

1. **Svelte and SvelteKit have no usable numbers here.** Both names appear only as chart series. The values available here are detached from their labels and the commentary does not discuss them. The honest entry is `unstated`, not a low score and not a high one. If the choice turns on Svelte sentiment, get the survey's exported data from the survey site.
2. **Both pages were only partly available.** Chart numbers float free of labels, so quote only the prose. A figure such as a respondent count in a happiness block cannot be tied to a question reliably.
3. **No sample or method.** The pages reviewed give no dates, sample description, weighting or recruitment. It is a self-selected survey of people who answer web-development surveys.
4. **Not about AI products.** It says nothing about streaming chat, approvals or agent backends. Satisfaction with a framework is not fitness for an AI workload.
5. **Timing.** The pages reviewed carry no survey dates. Check whether the results predate Next.js 16.4 (2026-10-06, Cache Components recommended for every app) and SvelteKit 3 (2026-10-01) before reading them as a verdict on the current releases.
6. **Usage and satisfaction are different axes.** Next.js shows both at once: rising usage, falling satisfaction. A dominant, disliked tool can still be the right choice, and a loved, small one can still be wrong for a team that must hire.

## Reading it into a decision record

- Record the Next.js signal as mixed: dominant usage, falling satisfaction, a named pain-point category, and no AI-specific measure. Use `kind: independent` and cite the survey page.
- Record the SvelteKit signal as absent. Do not pad it with the vendor's release post; that is evidence of activity, not of satisfaction.
- Do not use the survey to rank the protocol layer. It does not cover agent protocols or CopilotKit.
- Vendor adoption figures are not survey evidence. Vercel reports "over 20 million monthly downloads" for AI SDK 6 and "over 16 million weekly downloads" for AI SDK 7. The units differ, the figures are Vercel's own, and downloads count installs rather than users.

## Sources

- https://2025.stateofjs.com/en-US/libraries/meta-frameworks/
- https://2025.stateofjs.com/en-US/libraries/front-end-frameworks/
- https://vercel.com/blog/ai-sdk-6
- https://vercel.com/blog/ai-sdk-7
- https://nextjs.org/blog/next-16-4
- https://svelte.dev/blog/sveltekit-3-is-here
