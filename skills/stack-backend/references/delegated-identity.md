---
as_of: 2026-11-06
---
# Delegated identity for tools: mechanics and limits per cloud

Read this when a tool must act as the end user. All three clouds now separate three things: who may call the agent, what the agent is, and whose authority reaches the tool. Everything below is the vendor's own statement. No independent test of any of these flows was found.

## The trap all three share

The platform can isolate tokens, yet still see one caller. If your web app calls the agent with its own workload identity, the platform cannot tell users apart unless you pass the user identity in a form it trusts.

- **AWS:** "AgentCore does not enforce session-to-user mappings." Your backend owns the map from user to session ID, and any per-user session cap.
- **Azure:** Foundry "doesn't enforce per-user authorization on conversations." Microsoft names passing a client-supplied conversation ID through as a Broken Object Level Authorization flaw. Hosted per-user session isolation applies only when the request carries the end user's identity.
- **Google:** The Agent Identity overview describes a three-identity model (user, agent, delegated). The pages reviewed do not say who maps a user to a session.

Spike for all three: two users, one app. User B sends user A's session ID. Pass when the platform or your backend refuses it.

## AWS: AgentCore

1. **Inbound.** A runtime version takes IAM SigV4 or a JWT bearer token, "but not both simultaneously". Use separate versions if you need both.
2. **JWT path.** The authorizer checks discovery URL, audiences, clients, scopes and custom claims. The runtime then calls `GetWorkloadAccessTokenForJWT` and hands your code a Workload Access Token.
3. **Outbound.** Your tool calls `GetResourceOauth2Token`, which returns a consent URL the first time. AgentCore Identity stores the third-party token under workload identity plus the user ID from the inbound token, until it expires.
4. **Weak path.** The `X-Amzn-Bedrock-AgentCore-Runtime-User-Id` header is an opaque value AWS does not verify. AWS offers it for customer-managed identifiers and quickstarts, and says to use JWT in production. Where you do not need it, deny `bedrock-agentcore:InvokeAgentRuntimeForUser` in IAM.
5. **Later additions in the release notes.** On-Behalf-Of token exchange (April 2026) and Private Key JWT across machine, on-behalf-of and user-delegated flows (July 2026). The Identity page also lists consent portal and private identity provider guides, not reviewed here.

Gateway bypass: restricting a runtime to a gateway is only as strong as who can assume the gateway's role. Use a resource policy with an explicit deny for SigV4, or `allowedWorkloadConfiguration` for JWT. AWS warns the controls "only protect you if all traffic actually flows through the gateway".

Defaults to check: the CLI-created execution role permits model invocation for all foundation models in the account. Identity quota is 50 credential providers of each kind and 11,000 workload identities.

## Azure: Foundry

Auth lives on the connection, not in agent code. Pick one per tool.

| Connection `authType` | Whose identity reaches the tool | Trap |
| --- | --- | --- |
| `custom-keys` | Shared key | Anyone with access to the project can read a key stored in a project connection |
| `project-managed-identity` | Project | Shared by every agent in the project |
| `agentic-identity` | The agent | Starts with no downstream permissions; grant them on the target service |
| `oauth2` | User who consents | Scope is per tool connection per project, so each user consents per tool |
| `user-entra-token` | Signed-in Entra user | Works only for a listed set of endpoint patterns |

Facts an expert would otherwise hit in a spike:

- **Tenant.** The user's Entra tenant must match the Foundry project's. "Cross-tenant token exchange isn't supported." This can eliminate Foundry delegation for a multi-tenant SaaS.
- **Consumer role.** Passthrough users need at least Foundry Agent Consumer on the project.
- **Refresh.** Add `offline_access` to enable automatic token refresh. Separately, Microsoft ties the error "Your session has expired" to an invalid refresh token or a wrong refresh URL, so check the URL too. Scopes are space-separated on the MCP page, while the toolbox CLI example shows commas.
- **Client work.** Your client must render `oauth_consent_request` in `response.output_item`, then submit another response with the previous response ID. Declined consent fails the tool call. MCP calls default to `require_approval: always`, which is a separate stall (`mcp_approval_request`).
- **Audience block.** With managed OAuth on Entra, a token for a known Microsoft audience sent to a custom server returns "Cannot pass Microsoft token to untrusted MCP endpoint." Use custom OAuth with your own app registration.
- **Hosted agents.** The agent credential alone does not resolve the user. Use `FoundryToolbox` or `AddFoundryToolboxes`, which forward `x-agent-foundry-call-id`. Do not hard-code or reuse that ID.
- **Direct toolbox clients.** They cannot use blueprint sign-in or `AgentOnBehalfOfUser`. They need a per-tool OAuth sign-in and a client that handles the interactive request. Microsoft warns not to assume a generic MCP client does this.
- **Preview.** "Agent identity acting on behalf of the user is in preview" and needs blueprint endpoint access.
- **Migration.** Moving a legacy shared identity to the current model changes the identity, and "existing role assignments don't transfer".

Pages differ on prompt-agent identity. The baseline architecture says all agents in a project "share the same managed identity". The identity page says newly created agents get their own blueprint and identity, and legacy agents use the shared one. The identity page is the more specific statement of the current model; confirm which object model your project uses.

Isolation keys: `x-ms-user-isolation-key` is "a partitioning value, not an authentication or authorization mechanism", and the platform does not validate it. With the default Entra source the header is accepted and ignored.

Microsoft's own case for not building this yourself names a wrong cache key that leaks one user's access to another and "passes every functional test". That is a vendor selling a feature, but the failure mode is real, so test it directly if you build your own.

## Google: Agent Identity and auth manager

- **Identity.** A SPIFFE principal derived from the hosting resource ID, with an X.509 certificate valid for 24 hours that Google rotates. Tokens are bound with mTLS to Google APIs and DPoP across the Agent Gateway.
- **Delegated flow.** Three-legged OAuth auth providers in the auth manager. Audit logs show both agent and user identity.
- **Redeploy trap.** The Runtime page warns that pipelines which delete and recreate agents (blue-green, Terraform) "can experience silent runtime access loss", because the new resource ID is a new principal and grants are not inherited. Make the grant a deploy step. Deleting an agent leaves its IAM bindings behind as inactive grants.
- **Gateway default.** Agents with no Agent Identity are blocked, and destinations are blocked unless IAM grants them. Dry-run mode (`iamEnforcementMode: DRY_RUN`) lets all traffic through and only logs.
- **Limitation printed.** No legacy Cloud Storage bucket roles.

Status is messy. The release notes give Agent Identity "for General Availability" (2026-04-22) and the newer Agent Identity API as Preview (2026-06-18), with the old IAM Connectors API running side by side during migration. The Runtime identity page marks sandbox access as Preview. The pre-rename overview still says Preview. Record which API your design depends on.

Cloud Run is the unresolved case. The Agent Identity overview lists it as supported and so does the Cloud Run agent page. The Gateway policy page instead uses a service-account-based workload identity principal for Cloud Run agents. The Cloud Run setup page was not in the reviewed set, so treat this as a spike.

## Sources

- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html
- https://learn.microsoft.com/azure/foundry/agents/how-to/mcp-authentication
- https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/tool-authentication
- https://learn.microsoft.com/azure/foundry/agents/concepts/agent-identity
- https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/manage-hosted-sessions
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/architecture/baseline-microsoft-foundry-chat
- https://docs.cloud.google.com/agent-builder/agent-engine/agent-identity
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/set-up-agent-gateway.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/assign-identity-iam.md.txt
- https://docs.cloud.google.com/run/docs/ai-agents.md.txt
