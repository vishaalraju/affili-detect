# Affili-Detect AI Shopping Copilot

A final-year full-stack project: visual affiliate discovery plus an authenticated, RAG-grounded shopping chatbot.

## Architecture

- **React + Vite**: responsive product interface and chat UI.
- **Express API**: JWT authentication, request validation, rate limiting and error handling.
- **SQLite**: users, conversations, messages and request logs. Swap the repository layer for MongoDB/MySQL when deploying a multi-instance service.
- **RAG**: OpenAI embeddings + cosine-similarity local vector cache for development. The curated dataset is in `backend/data/affiliate-catalog.json`; an optional Pinecone retrieval and indexing path supports production-scale vector search.
- **LLM**: OpenAI Responses API. Answers are explicitly constrained to retrieved catalog context.

## Local setup

1. Copy `.env.example` to `.env` and `backend/.env.example` to `backend/.env`.
2. Set a unique `JWT_SECRET` (32+ characters) and `OPENAI_API_KEY` in `backend/.env`.
3. Install and run the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. In a second terminal, start the frontend:

   ```powershell
   npm run dev
   ```

Open the app, select **AI Shopping Copilot**, create an account, and start chatting.

For Pinecone, create a dense index matching the embedding dimensions, set `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`, and `PINECONE_NAMESPACE`, then run `npm run index:catalog` from `backend/`. Without Pinecone, the API creates a local vector cache after its first embedded query.

## Deployment

Build the frontend with `npm run build` and host `dist/` on a static host. Deploy `backend/` as a Node service with persistent storage for `/app/data`; set all values from `backend/.env.example` as platform secrets. GitHub Pages only hosts the frontend—use Render, Railway, Fly.io, or a similar service for the API, then set `VITE_API_URL` to its HTTPS URL before building.

For Docker, copy `backend/.env.example` to `backend/.env`, configure its secrets, and run `docker compose up --build`.

### Free Render backend

The repository includes `render.yaml`. In Render, choose **New → Blueprint**, select this repository, and enter your `OPENAI_API_KEY` when prompted. After deployment, copy the service URL and add it in GitHub under **Settings → Secrets and variables → Actions → Variables** as `VITE_API_URL` (for example, `https://affili-detect-api.onrender.com`). Push any commit or rerun the Pages workflow to rebuild the frontend with the API URL.
