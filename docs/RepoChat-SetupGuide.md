# RepoChat — Setup Guide

## Prerequisites

Make sure the following are installed before starting:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node — run `npm install npm@latest -g` to update |
| Docker | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| Docker Compose | Latest | Included with Docker Desktop |
| Git | Any | Required by the backend at runtime for repo cloning |

You will also need:

- A **MongoDB Atlas** account with a free M0 cluster — [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
- An **OpenAI API key** with access to `text-embedding-3-small` and `gpt-4o-mini` — [platform.openai.com](https://platform.openai.com)

---

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | `3000` |
| Backend (Express) | `5000` |
| MongoDB (local Docker currently commented out) | `27017` |

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/Tarif24/repo-chat
cd repo-chat
```

---

## Step 2 — Install dependencies

Run this from the project root, it will install all dependencies for the root and each service:

```bash
# Root
npm run install:all
```

---

## Step 3 — Environment variables

### Backend — `backend/.env`

Create the file:

```bash
cp backend/.env.example backend/.env
```

Then fill in the values:

```env
PORT=8080
NODE_ENV=development

# MongoDB
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/repochat

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Storage
REPO_STORAGE_PATH=./repoCloning

# Logging
LOG_LEVEL=info
```

### Frontend — `frontend/.env`

Create the file:

```bash
cp frontend/.env
```

Then fill in the values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Step 4 — MongoDB Atlas setup

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write access
3. Under **Network Access**, add `0.0.0.0/0` to allow connections from your machine
4. Copy the connection string into `MONGO_URL` in `backend/.env` — use the `mongodb+srv://` format
5. The following collections will be created automatically on first use:
   - `repositories`
   - `chunks`
6. Note: Vector search is created for you in the database connection file

---

## Step 5 — Run with Docker Compose

From the project root:

```bash
npm run docker:build
```

This starts the frontend, backend, and a local MongoDB instance ( currently commented out ) together.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
| Health check | http://localhost:8080/api/health/check |

To stop:

```bash
npm run docker:down
```

To stop and wipe local MongoDB data:

```bash
docker-compose down -v
```

---

## Step 6 — Run without Docker (development)

If you want hot reload during development, run each service manually.

**Backend:**

```bash
#root
npm run dev:backend
```

**Frontend:**

```bash
#root
npm run dev:frontend
```

Both use `nodemon` / Next.js dev server, respectively. Changes will hot reload.

---

## Verify everything is working

1. Open http://localhost:3000
2. Paste a small public GitHub repo URL (something under 1–2 MB to keep ingestion fast)
3. Wait for ingestion to complete
4. Ask a question about the repo
5. You should receive an answer with source file references

To manually test the backend in isolation:

```bash
# Health check
curl http://localhost:8080/api/health/check

# Ingest a repo
curl -X POST http://localhost:8080/api/ingest/repo \
  -H "Content-Type: application/json" \
  -d '{"repoURL": "https://github.com/your-username/some-repo"}'

# Query
curl -X POST http://localhost:8080/api/query/userQuery \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does authentication work?",
    "repoURL": "https://github.com/your-username/some-repo",
    "chatHistory": []
  }'
```

---

## Gotchas

### Atlas Vector Search index
Atlas Vector Search index creation can fail on a cold M0 cluster. The backend attempts to create the vector index automatically on startup with 10 retries over 50 seconds. On a cold Atlas M0 instance, mongot can take longer than this to become available. If queries return empty results with no error, go to Atlas → Search Indexes and check the index status. If the index is missing, restart the backend to trigger another creation attempt.

### Atlas Network Access must allow your IP
If the backend fails to connect to MongoDB with a timeout error, go to Atlas → Network Access and confirm your current IP is whitelisted. During development, `0.0.0.0/0` is the simplest option.

### `directConnection: true` is incompatible with Atlas
Do not add `directConnection: true` to the Mongoose connection options when using a `mongodb+srv://` connection string. It causes a silent connection failure.

### Git must be installed on the host machine for local dev without Docker
The backend calls the `git` binary at runtime via simple-git. If you run the backend outside Docker and git is not on your PATH, repo cloning will fail. Run `git --version` to check.

### `NEXT_PUBLIC_API_URL` is baked in at build time
Next.js bakes `NEXT_PUBLIC_` variables into the static build. If you change this value, you must rebuild the frontend — a restart is not enough. In production, it should be empty (relative paths via CloudFront). In local dev, it should be `http://localhost:8080`.

### PORT conflict if running locally and in Docker at the same time
If you start a service manually and then run `docker-compose up`, Docker will fail to bind the port. Make sure all manually started services are stopped first.

### Docker build on Apple Silicon requires platform flag
If you are building the backend Docker image on an M1/M2/M3 Mac for deployment, you must use:
```bash
docker buildx build --platform linux/amd64 --provenance=false ...
```
Without `--provenance=false`, Docker creates a manifest list that Lambda rejects. Without `--platform linux/amd64`, the image will not run on AWS.

### MongoDB `storageSize` does not decrease after deletions
If you are testing the storage management logic locally, note that `storageSize` in MongoDB stats does not drop after documents are deleted until `compact` runs. Use `dataSize` (exposed as `liveUsedMB` in the codebase) for any loop termination conditions — it updates immediately.
