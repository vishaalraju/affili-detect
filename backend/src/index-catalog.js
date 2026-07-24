// Run after creating a Pinecone dense index compatible with text-embedding-3-small.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_HOST) {
  throw new Error("OPENAI_API_KEY, PINECONE_API_KEY and PINECONE_INDEX_HOST are required.");
}
const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.resolve(here, "../data/affiliate-catalog.json"), "utf8"));
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const texts = catalog.map((item) => `${item.title}. ${item.summary}. Tags: ${item.tags.join(", ")}`);
const embeddingResponse = await client.embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small", input: texts });
const response = await fetch(`https://${process.env.PINECONE_INDEX_HOST}/vectors/upsert`, {
  method: "POST",
  headers: { "Api-Key": process.env.PINECONE_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ namespace: process.env.PINECONE_NAMESPACE || "affili-detect", vectors: catalog.map((item, index) => ({ id: item.id, values: embeddingResponse.data[index].embedding, metadata: item })) })
});
if (!response.ok) throw new Error(`Pinecone indexing failed: ${await response.text()}`);
console.log(`Indexed ${catalog.length} catalog documents.`);
