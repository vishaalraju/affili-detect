import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.resolve(here, "../data/affiliate-catalog.json"), "utf8"));
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const cachePath = path.resolve(here, "../data/vector-cache.json");

function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cosine(a, b) { return dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b))); }
function documentText(document) { return `${document.title}. ${document.summary}. Tags: ${document.tags.join(", ")}`; }

async function embeddingsFor(texts) {
  if (!client) return null;
  const response = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: texts
  });
  return response.data.map((item) => item.embedding);
}

async function loadIndex() {
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  const vectors = await embeddingsFor(catalog.map(documentText));
  if (!vectors) return null;
  const index = catalog.map((document, index) => ({ ...document, vector: vectors[index] }));
  fs.writeFileSync(cachePath, JSON.stringify(index));
  return index;
}

async function pineconeSearch(query) {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_HOST) return null;
  const [vector] = await embeddingsFor([query]);
  const response = await fetch(`https://${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: { "Api-Key": process.env.PINECONE_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ namespace: process.env.PINECONE_NAMESPACE || "affili-detect", vector, topK: 3, includeMetadata: true })
  });
  if (!response.ok) throw new Error("Pinecone retrieval failed.");
  const { matches = [] } = await response.json();
  return matches.map((match) => ({ id: match.id, score: match.score, ...match.metadata }));
}

export async function retrieve(query, limit = 3) {
  const managedResults = await pineconeSearch(query);
  if (managedResults) return managedResults;
  const index = await loadIndex();
  if (index) {
    const [queryVector] = await embeddingsFor([query]);
    return index.map((document) => ({ ...document, score: cosine(queryVector, document.vector) }))
      .sort((a, b) => b.score - a.score).slice(0, limit)
      .map(({ vector, ...document }) => document);
  }
  // Allows a usable local demo before an API key is configured.
  const words = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  return catalog.map((document) => ({ ...document, score: documentText(document).toLowerCase().split(/\W+/).filter((word) => words.has(word)).length }))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function answer(question, history) {
  const sources = await retrieve(question);
  if (!client) {
    return {
      text: "AI generation is not configured yet. Add OPENAI_API_KEY to backend/.env, then restart the server. Here are the most relevant catalog entries.",
      sources
    };
  }
  const context = sources.map((source) => `- ${source.title}: ${source.summary} Price range: ${source.priceRange}`).join("\n");
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: "You are Affili-Detect's helpful shopping copilot. Answer only from the provided product context. Be concise, say when information is unavailable, never invent prices or discounts, and remind users to verify current retailer details." },
      ...history.map((message) => ({ role: message.role, content: message.content })),
      { role: "user", content: `Product context:\n${context}\n\nQuestion: ${question}` }
    ]
  });
  return { text: response.output_text, sources };
}
