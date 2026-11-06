---
as_of: 2026-11-06
---

# Hosting traps for a streaming Next.js or SvelteKit app

Read this when the front end must run on AWS, Azure or Google Cloud, before you name a host in a decision record, and when writing the streaming spike. The pages below are the hosts' own. Some are undated, so the date on this file is the check date, not the vendors' date.

## Contents

- Read this first: the three questions every host must answer
- AWS Amplify
- Amazon ECS behind an Application Load Balancer
- CloudFront and Lambda response streaming
- AWS App Runner
- Azure Static Web Apps, hybrid Next.js
- Azure Container Apps
- Google Cloud Run
- Firebase App Hosting
- Traps that cross hosts
- The spike

## Read this first: the three questions every host must answer

1. Does the host run the Next.js version you will ship? A new `create-next-app` is on the 16.x line with Cache Components on, and the framework's 16.4 post says that model becomes the default in Next.js 17.
2. Does a streamed response reach the browser unbuffered, and for how long can it stay open?
3. Can the browser or the front-end server reach the agent backend without a custom bridge, and does that path stream too?

The fact set answers these per host; run `gate frontends --where kind=hosting --require nextjs_ssr,streaming_responses`. Most cells say `unstated` because vendor pages are silent. That is the result, not a gap in the tooling.

## AWS Amplify

- **Version range.** The page supports Next.js 12 through 15 ("up through Next.js 15") and has no date. It does not say whether 16 runs. A project created from the current template is outside the stated range.
- **Streaming is listed as unsupported.** "Next.js streaming" sits in the unsupported list, with edge API routes, on-demand ISR, middleware on static assets and `unstable_after`. The same page lists API routes and server-side rendered pages as supported and never mentions route handlers or HTTP streaming, so it does not say how far that phrase reaches. An AI chat route that streams from a route handler is what it puts in doubt, and so is Cache Components, which the Next.js post describes as streaming static and dynamic content in one response. Do not read "SSR is supported" as "streaming works".
- **The only number is an image cap.** Output images cannot exceed 4.3 MB. No request timeout or bundle limit appears.
- **A CopilotKit-described AG-UI sample** serves the front end from Amplify and puts API Gateway and a CopilotKit runtime on Lambda in front of AgentCore. CopilotKit's post says AWS's base template does not have that server, so this is one vendor's shape, not an AWS-documented one. It does not say the front end is server-rendered Next.js.

## Amazon ECS behind an Application Load Balancer

AWS names ECS Express Mode as the path for new customers in place of App Runner. Express Mode sets up a Fargate-based service, a load balancer with TLS, auto scaling and monitoring, for stateless containers that serve HTTP.

- **The load balancer's idle timeout decides a silent gap.** It defaults to 60 seconds: with no data sent or received, the connection closes. AWS says to send at least 1 byte before each period elapses and to raise it as needed. The page gives no upper limit. A silent tool call longer than the timeout ends the stream unless you send heartbeat bytes or raise it.
- **HTTP/2 PING frames do not reset it.** Heartbeats must be data. Keep the app's own idle timeout larger than the load balancer's, or AWS warns of a 502.
- **Client keepalive is a separate clock.** It defaults to 3600 seconds (60 to 604800). After it elapses the load balancer accepts one more request and then closes gracefully.
- **Express Mode shares load balancers** across services on the same networking configuration, so check who else is affected before changing an attribute.
- **Streaming and Next.js are not stated.** No page reviewed says a streamed response works or mentions Next.js. The cell is `unstated`, so run the spike.
- **Tasks can stop.** AWS can retire a task on a vulnerable platform revision, and Fargate Spot gives a two-minute warning. A dropped task ends its streams.

## CloudFront and Lambda response streaming

- **Lambda streams natively** through function URLs, `InvokeWithResponseStream` and the API Gateway proxy integration, on Node.js managed runtimes and not yet in all Regions. Function URLs do not stream inside a VPC. The Lambda console always shows responses buffered, so do not test there.
- **CloudFront's origin response timeout defaults to 30 seconds** and applies to the first response and to the gap between packets. On POST, a timeout drops the connection with no retry. An account quota increase does not update existing origins.
- **Response completion timeout** is optional and a hard total, ending in a 504. If unset, CloudFront enforces no maximum, so do not set one below your longest turn.
- **The hop is unproven.** Neither page says a stream passes through CloudFront. The cell is `conditional`.
- **Cost and bandwidth.** The first 6 MB is uncapped, then at most 2 MBps. A broken client connection does not stop the function, and you pay for the full duration.
- **Next.js is not stated** on either page, and the function timeout is not on these pages.

## AWS App Runner

AWS says App Runner "is no longer open to new customers", existing customers can continue as normal, and it recommends ECS Express Mode otherwise. Do not propose it for new work. Its overview states no streaming, timeout or Next.js fact.

## Azure Static Web Apps, hybrid Next.js

- **It is a preview.** The page labels hybrid Next.js preview and gives no GA date. Record it as `conditional`, and say preview in the record.
- **Linked backends are unsupported in hybrid mode.** Azure Functions, App Service, Container Apps and API Management cannot be linked. The static-export mode allows linked backends but gives up server rendering. The page does not say how a hybrid app should reach an agent on Container Apps, so plan on your own cross-origin and auth work.
- **Plan.** The page's server-side rendering steps need the Standard plan or above and an App Service Plan of at least S1, using "Configure linked backend". The page does not explain how that fits the unsupported list above.
- **Size and gaps.** Maximum hybrid app size is 250 MB (use Next.js standalone output). Navigation fallback in `staticwebapp.config.json` is unsupported, so route rewrites go in `next.config.js`. ISR image caching is unsupported, and the SWA CLI does not emulate or deploy hybrid apps.
- **No streaming statement.** The page is silent. Next.js runs on a dedicated App Service instance behind the static host, so the stream crosses two layers; test both.

## Azure Container Apps

- **Request time out is 240 seconds.** The ingress page lists it among HTTP ingress properties and does not say whether it counts idle or total time. If total, even a chatty stream ends at four minutes, so measure it. The Well-Architected guide says premium ingress gives dedicated proxy resources with configurable timeouts. A long agent turn needs the premium setting or a reconnecting client.
- **Quotas page.** It lists cores, environments, GPUs and session pools, with no request or run duration. Express apps are limited to 30 replicas, and Sandboxes and Express to 2,000 cores.
- **WebSocket is supported; SSE is not named.** The ingress page lists HTTP/1.1, HTTP/2, WebSocket and gRPC. Do not infer SSE behaviour from that list; test it.
- **No Next.js page.** Neither page checked mentions Next.js. It is a generic container host, so the Next.js build, the standalone output and the Node version are yours to own.
- **Platform advice that affects chat apps.** At least three replicas for ingress-exposed apps, minimum always-ready replicas against cold starts, session affinity available for sticky routing. Evaluate express first for new platforms, but confirm its limits, since the guide says to validate that its focused capability set fits the workload.
- **Internal ingress** lets an app call another app in the same environment, which is the clean way to keep the agent off the public internet. Ingress visibility describes the app relative to its environment, not to the internet.

## Google Cloud Run

- **Streaming is documented.** The agents page says Cloud Run supports streaming HTTP responses and WebSockets.
- **Request timeout.** The default is 5 minutes (300 seconds); it can be raised to 60 minutes (3600 seconds), and the console accepts 1 to 3600. Only the gcloud text says "less than 60 minutes". Past 15 minutes Google recommends designing handlers so clients can reconnect, since a reconnect starts a new request that may reach a different instance. That is a design constraint on any resumable stream.
- **Other limits.** The quotas page caps HTTP/1 responses at 32 MiB unless chunked or streaming, and allows 1,000 concurrent requests per instance. Job tasks (168 hours) and instances (7 days) have separate limits, and neither extends a service request.
- **Node version mismatch.** The Next.js quickstart asks for Node.js 20 or later. AI SDK 7 requires Node.js 22 or later and is ESM only; its migration guide says Node.js 22 reached end of maintenance on 2026-04-30 and prefers 24 or 26. Pin the container base image to the AI SDK's requirement, not the quickstart's.
- **Quickstart is hello world.** It deploys `create-next-app@16`, labels nothing GA or preview and says nothing about server rendering, server actions, streaming or concurrency for Next.js. Google points to Firebase App Hosting for "optimized deployments with CDN for server-rendered Next.js apps".
- **Resource type matters.** The agents page offers services (stateless, scale to zero), instances (always-on singleton), worker pools and jobs. A chat front end is a service. A long-running per-user agent loop is not obviously one.

## Firebase App Hosting

- The overview says it has built-in, preconfigured support for Next.js and Angular, tells teams adding generative AI to use its streaming support "to maintain fast initial load times", and says apps are served on Cloud Run, with each rollout a new Cloud Run revision.
- That streaming line describes page loading, so it is recorded as `conditional`: it does not say a long streamed API response works.
- It states no release stage, no request limit and no size limit. If the Cloud Run timeout applies, the page does not say so; confirm in a spike.

## Traps that cross hosts

- **Every hop can buffer or cap a stream.** CDN, API gateway, load balancer, WAF and corporate proxy all sit between the model and the browser. A host's "streaming works" claim covers the host. The spike must run through the same intermediaries as production.
- **Timeouts stack.** The AI SDK 7 timeout options (total, per step, per chunk, per tool) measure the SDK's view. The host's request limit, the gateway's limit and the model provider's limit are separate clocks. Set the SDK's `chunkMs` below the smallest host limit so a stalled stream ends cleanly. The default silent-gap limits differ widely: CloudFront 30 seconds, Application Load Balancer 60 seconds, Container Apps ingress 240 seconds (type not stated). Cloud Run's 5-minute default counts the whole request.
- **Approvals outlive requests.** A pending approval that waits minutes or hours cannot sit in an open request on any host above. Persist it and resume with a new request (see the approvals reference).
- **Reconnect is not resume.** A dropped stream that restarts a run repeats work. AG-UI defines `MessagesSnapshot` for resync and, per CopilotKit's AWS article, AgentCore replays history without tool results; test a refresh in the middle of a tool call.
- **Region coupling.** AgentCore's AG-UI support was announced for fourteen named regions. Put the front end and the runtime in regions the pages support before measuring latency.
- **Preview labels move.** Re-read the page for the Static Web Apps label and the Amplify version range on the vendor's page before you rely on them.

## The spike

Run these six checks on the chosen host, through production's intermediaries, with the production Node version, and write down the result of each:

1. Time to first streamed byte for a 10-token reply.
2. A 3-minute reply that sends a chunk at least every 10 seconds: does it finish?
3. A 6-minute reply with a 90-second silent tool call: does it finish, or at what second does it end, and with what status?
4. A page refresh at second 30 of a run: what does the client show?
5. An approval left pending for 10 minutes, then answered: does the run resume once?
6. Chunks arrive when sent, not in one burst at the end. A host that buffers fails this even if checks 2 and 3 pass.

## Sources

- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
- https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html
- https://learn.microsoft.com/en-us/azure/container-apps/quotas
- https://docs.cloud.google.com/run/quotas
- https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs
- https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview
- https://learn.microsoft.com/en-us/azure/well-architected/service-guides/azure-container-apps
- https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service
- https://docs.cloud.google.com/run/docs/ai-agents
- https://docs.cloud.google.com/run/docs/configuring/request-timeout
- https://firebase.google.com/docs/app-hosting
- https://nextjs.org/blog/next-16-4
- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://vercel.com/blog/ai-sdk-7
- https://www.copilotkit.ai/blog/generative-ui-on-agentcore-with-copilotkit
- https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-bedrock-agentcore-runtime-ag-ui-protocol
