---
as_of: 2026-11-06
---
# Vector and search stores per cloud

Read this when the backend needs retrieval and the store is not settled. Vendor latency and speed numbers are not comparable across clouds, because conditions are unstated. No independent cross-cloud benchmark was found. Run your own recall and filtered-latency test on your own data before you cite any number.

## AWS

AWS's own comparison lists seven individual stores, plus managed Bedrock Knowledge Bases. A selection:

| Store | AWS's "best for" | Printed figures, AWS's characterization |
| --- | --- | --- |
| OpenSearch Service | High-throughput, low-latency queries | Sub-10 ms with GPU acceleration; billions of vectors, cluster-dependent |
| RDS PostgreSQL with pgvector | Hybrid SQL and vector | 10 to 100 ms; millions, instance-dependent |
| MemoryDB | Real-time, ultra-low latency | Sub-millisecond; millions per database |
| Neptune Analytics | GraphRAG and knowledge graphs | Sub-second; billions |
| S3 Vectors | Long-term, infrequent queries | 2 billion per index, 10,000 indexes per bucket; "up to 90% savings" |

Conflict inside the same page: S3 Vectors query latency is "Sub-100 ms" in one table and "100 ms or more" in the Knowledge Bases table. Measure it.

Knowledge Bases can sit on Aurora PostgreSQL with pgvector, Neptune Analytics, OpenSearch Serverless, S3 Vectors, Pinecone or Redis Enterprise Cloud. AWS lists the last two as multi-cloud for data residency, so check them against any rule that keeps data on one cloud.

Managed knowledge bases (a distinct quota page) print 10,000 per account and Region (not adjustable), 200 data sources and 10 TB raw storage per knowledge base, 600 `Retrieve` requests per minute per knowledge base with a burst of 25 per second, 300 `AgenticRetrieveStream` requests per minute per account, and 10,000 query characters. Regions and file-size limits are not on that page.

## Azure

**Azure AI Search.** Vector search is "available in all regions and on all tiers at no extra charge"; embedding and enrichment are billed by the provider. Hybrid runs vector and keyword search in parallel and merges results in one request. Samples target `text-embedding-ada-002`.

**Agentic retrieval has a status split that decides production use.** REST `2026-04-01` is for production with GA knowledge source types and minimal, extractive retrieval. REST `2026-08-01-preview` carries LLM query planning, answer synthesis, non-minimal reasoning effort and multi-turn messages. Preview features have no SLA. The trap: "The Azure portal and Microsoft Foundry portal provide preview-only access". Objects built there may use preview schemas and need migration to the GA API. A prototype built in the portal is on the preview path whether or not you meant it. Query planning and synthesis also bill Azure OpenAI tokens.

**pgvector on Azure Database for PostgreSQL.** Microsoft states:

- Vectors over 2,000 dimensions can be stored but not indexed. Reduce dimensions or partition and shard.
- `hnsw.ef_search` defaults to 40. Set it per transaction with `SET LOCAL`.
- With no index, search is exact: perfect recall at a performance cost.
- A partial index may be silently skipped if the query's `WHERE` form does not match the index definition. Check the plan.
- DiskANN is offered here only on Flexible Server. Microsoft says it balances accuracy and build time.

## Google Cloud

The pages name at least five routes and give no guidance on choosing between them. Vector Search 1.0 is named but no page on it was reviewed.

| Route | Status and region as printed | Fact worth knowing |
| --- | --- | --- |
| AlloyDB with pgvector and ScaNN | No label | Google claims up to 10x faster index creation, 4x faster queries, 10x faster filtered queries than standard HNSW, workload unstated. Adaptive and inline filtering. ScaNN is an AlloyDB feature here |
| Cloud SQL for PostgreSQL with pgvector | No label; the instance must be where the model is supported | `google_ml_integration` 1.2 or later, 1.4.2 for third-party or custom models. HNSW `m` default 16, `ef_construction` default 64. Google warns against unversioned model names, which can change results |
| RAG Engine (managed framework) | 22 regions: GA and allowlisted `us-central1`, `us-east4`; GA `europe-west3`, `europe-west4`; allowlist preview `us-east1`, `europe-west1`; the rest Preview | New projects need the allowlist for those four. "Data residency and AXT security controls aren't supported." A RAG Engine-managed Spanner instance is billed to you in GA locations |
| Agent Retrieval (formerly Vector Search 2.0) | No label; nine regions; its managed MCP server row is "(Preview)" | Collections of JSON objects with built-in or your own embeddings. VPC-SC supported. Page gives no scale limits, and does not cover hybrid or full-text |
| Cloud Run agent page | Names only pgvector on Cloud SQL or AlloyDB | |

Naming: the release notes of 2026-04-22 rename Vertex AI Vector Search 2.0 to Agent Retrieval and Vertex AI RAG Engine to RAG Engine. Older pages still say Vertex AI.

## What to record

Copy these into the decision record's `verify_before_relying`: recall at the target filter selectivity on your data; p95 filtered latency at target concurrency; which API version or launch stage the design depends on; whether the region allows the store, the embedding model and the runtime together; and cost at target index size. If a store is multi-cloud or preview, add it as a hard constraint check.

## Sources

- https://docs.aws.amazon.com/prescriptive-guidance/latest/choosing-an-aws-vector-database-for-rag-use-cases/vector-db-comparison.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-quotas.html
- https://learn.microsoft.com/en-us/azure/search/vector-search-overview
- https://learn.microsoft.com/azure/search/agentic-retrieval-overview
- https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-optimize-performance-pgvector
- https://docs.cloud.google.com/alloydb/docs/ai/vector-search-overview
- https://docs.cloud.google.com/sql/docs/postgres/generate-manage-vector-embeddings.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/rag-overview.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search-2/overview.md.txt
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes.md.txt
- https://docs.cloud.google.com/mcp/supported-products.md.txt
- https://docs.cloud.google.com/run/docs/ai-agents.md.txt
