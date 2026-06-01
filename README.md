# RepoChat

An AI-powered developer tool that lets you ask natural language questions about any public GitHub repository. Paste a URL, and RepoChat ingests the codebase, builds a vector index, and answers your questions with direct references to the relevant source files.

→ [Live demo](https://tarifmohammad.com) &nbsp;|&nbsp; [Video walkthrough](#) &nbsp;|&nbsp; [Architecture diagram](#docs)

---

## What it does

RepoChat accepts a public GitHub URL, clones and parses the repository using Tree-sitter AST chunking, stores code chunks with embeddings in MongoDB Atlas, and exposes a chat interface for querying that codebase in natural language. Answers include source file references — file path, function or class name, and line numbers.

The core of the project is a tuned RAG pipeline with a multi-stage post-retrieval filter stack, a query interpreter using hypothetical document embedding (HyDE), a reranker, context compression, and semantic caching. See the [RAG Pipeline doc](docs/RepoChat-RAGPipelineExplanation.pdf) for a full walkthrough and the [pipeline diagrams](docs/RepoChat-IngestionPipelineDiagram.pdf) for a visual overview.

---

## Tech stack

**Frontend** — Next.js, React, TypeScript, Tailwind, Lucide React

**Backend** — Node.js, Express, TypeScript, OpenAI SDK (`text-embedding-3-small` + `gpt-4o-mini`), Tree-sitter, simple-git, Winston, Zod

**Database** — MongoDB Atlas, MongoDB Vector Search

**Infrastructure** — AWS (Lambda, API Gateway, S3, CloudFront, ECR, ACM, Route 53, SSM Parameter Store, CloudWatch), Docker, GitHub Actions

---

## Architecture

```
User → CloudFront → /api/*  → API Gateway → Lambda (Express backend)
                  → /*      → S3 (static Next.js frontend)
```

The backend runs as a containerised Express server via AWS Lambda Web Adapter — no application code changes required. The frontend is a statically exported Next.js build served from S3. A single CloudFront distribution handles routing, SSL termination, and CDN for both.

The backend follows a strict layered architecture:

```
Handler → Controller → Service → Repository / Provider
```

Repositories own all MongoDB queries. Providers own all external API calls. Services contain single-responsibility business logic. Controllers orchestrate services and never touch the database or providers directly.

Estimated hosting cost: ~$0.55/month.

---

## RAG pipeline overview

The query pipeline runs in this order:

1. Semantic cache check
2. Relevance filter and query sanitization
3. Query interpreter → hypothetical chunk + optional language/directory filters (HyDE)
4. Embed hypothetical chunk
5. Vector search with metadata pre-filters
6. Post-retrieval filter stack (score threshold → directory filter → overlap deduplication → noise filter → per-file cap)
7. Reranker (LLM rescore + topK slice)
8. Context compression (fires above 8,000 chars)
9. LLM answer generation
10. Save to semantic cache

For parameter values, prompt templates, and filter logic detail, see the [RAG Pipeline doc](docs/RepoChat-RAGPipelineExplanation.pdf). For the ingestion pipeline, see the [Ingestion Pipeline diagram](docs/RepoChat-IngestionPipelineDiagram.pdf).

---

## Supported languages

TypeScript, JavaScript, Python, Java, Go, Ruby, C++, C#, HTML, CSS, Markdown

---

## API

Full request/response shapes for all endpoints are in the [API Endpoints doc](docs/RepoChat-APIEndpoints.pdf).

| Method | Path                      | Description                            |
| ------ | ------------------------- | -------------------------------------- |
| `POST` | `/api/ingest/repo`        | Ingest a public GitHub repository      |
| `POST` | `/api/query/userQuery`    | Query an ingested repository           |
| `GET`  | `/api/query/getAllRepos`  | List all ingested repository URLs      |
| `POST` | `/api/query/getRepoByURL` | Get metadata for a specific repository |
| `GET`  | `/api/health/check`       | Health check                           |

---

## Data models

Schema definitions for the `repositories`, `chunks`, and `semantic_cache` collections are in the [MongoDB Models doc](docs/RepoChat-DatabaseModels.pdf).

The embedding dimension is 1536 (text-embedding-3-small). Each chunk stores its content, embedding, and metadata, including repo URL, relative file path, file name, code block name, type, language, parent directory, and start/end lines.

---

## Storage management

The free MongoDB Atlas tier (512 MB) requires active management. The ingestion pipeline predicts storage usage before accepting a new repo using an empirically validated formula (confirmed against real Atlas data), checks remaining capacity, and automatically evicts the least recently accessed repos if needed. A safety threshold is applied below the hard limit to absorb estimation variance and background writes.

The key finding from measurement: BSON array encoding of a 1536-dimension embedding costs ~20,400 bytes per document due to string index keys — roughly 1.4× the naive estimate. Average observed doc size is ~21.6 KB.

---

## Local setup

**Prerequisites:** Node.js 18+, Docker, MongoDB Atlas account, OpenAI API key

```bash
git clone https://github.com/your-username/repo-chat
cd repo-chat
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in MONGO_URL, OPENAI_API_KEY in backend/.env
docker-compose up
```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:8080`.

---

## Deployment

The full AWS deployment architecture, Dockerfile strategy, and Lambda Web Adapter configuration are covered in the [Hosting Strategy doc](docs/RepoChat-AWSHostingHandoff.pdf).

CI/CD runs on GitHub Actions: PRs trigger test + build, merges to main trigger full deploy to ECR → Lambda with a smoke test against `/api/health/check`.

---

## Testing

The test strategy covers unit tests (Jest + ts-jest) for each pipeline service in isolation, integration tests against a real MongoDB instance (mongodb-memory-server), and E2E tests (Playwright) for the full user flow. Because `$vectorSearch` does not run in MongoDB-memory-server, the vector search boundary is mocked in CI and tested separately against a seeded Atlas dev cluster.

Full test matrix is in the [Plan doc](docs/RepoChat-Plan_v2.pdf).

---

## Docs

| Document                                                                 | Contents                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [Plan](docs/RepoChat-Plan_v2.pdf)                                        | Architecture decisions, tech stack, test matrix, known issues |
| [RAG Pipeline](docs/RepoChat-RAGPipelineExplanation.pdf)                 | Full pipeline detail, parameter values, prompt templates      |
| [Ingestion Pipeline Diagram](docs/RepoChat-IngestionPipelineDiagram.pdf) | Ingestion flow diagram                                        |
| [Query Pipeline Diagram](docs/RepoChat-QueryPipelineDiagram.pdf)         | Query flow diagram                                            |
| [MongoDB Models](docs/RepoChat-DatabaseModels.pdf)                       | Collection schemas                                            |
| [API Endpoints](docs/RepoChat-APIEndpoints.pdf)                          | Request and response shapes                                   |
| [Hosting Strategy](docs/RepoChat-AWSHostingHandoff.pdf)                  | AWS architecture, cost breakdown, deployment decisions        |
| [Setup Guide](docs/RepoChat-SetupGuide.md)                  | Setup guide for local development        |
