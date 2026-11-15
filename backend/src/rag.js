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
    if (queryVector) {
      return index.map((document) => ({ ...document, score: cosine(queryVector, document.vector) }))
        .sort((a, b) => b.score - a.score).slice(0, limit)
        .map(({ vector, ...document }) => document);
    }
  }
  // Allows a usable local demo before an API key is configured.
  const words = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  return catalog.map((document) => ({ ...document, score: documentText(document).toLowerCase().split(/\W+/).filter((word) => words.has(word)).length }))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function retrieveByClass(className, limit = 3) {
  if (!className) return [];
  const cleanClass = className.toLowerCase().trim();
  const matched = catalog.filter((item) =>
    item.tags.some((tag) => tag.toLowerCase() === cleanClass) ||
    item.title.toLowerCase().includes(cleanClass)
  );
  if (matched.length > 0) return matched.slice(0, limit);
  return retrieve(className, limit);
}

export async function answer(question, history, productClass = null, affiliateTag = "affilidetect-20") {
  let sources = [];
  if (productClass) {
    sources = await retrieveByClass(productClass);
  }
  if (!sources || sources.length === 0) {
    sources = await retrieve(question);
  }

  // Build affiliate links for each source product
  const buildLinks = (title) => {
    const q = encodeURIComponent(title);
    return [
      `[🛒 Amazon](https://www.amazon.com/s?k=${q}&tag=${affiliateTag})`,
      `[🏪 Walmart](https://www.walmart.com/search?q=${q}&affili=${affiliateTag})`,
      `[🏷️ eBay](https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${affiliateTag})`
    ].join(" · ");
  };

  if (!client) {
    const offlineText = "👋 AI generation is offline (no OPENAI_API_KEY). Here's product data from the local database:\n\n" +
      sources.map(s => {
        const links = buildLinks(s.title);
        return `🛍️ **${s.title}** (${s.priceRange})\n${s.summary}\n**Shop:** ${links}`;
      }).join("\n\n");
    return { text: offlineText, sources };
  }

  const context = sources.map((source) =>
    `- ${source.title}: ${source.summary} Price range: ${source.priceRange}. Shop: ${buildLinks(source.title)}`
  ).join("\n");

  let responseText = "";
  const systemPrompt = `You are Affili-Detect's AI Shopping Advisor — an expert product analyst and deal finder. Your role goes beyond price comparison — you help users make smarter buying decisions.

Core capabilities:
1. **Product Analysis**: When asked "Is this worth buying?", give a clear YES/NO verdict with reasoning based on the product context.
2. **Pros & Cons**: List specific advantages and disadvantages of the product.
3. **Price Prediction**: If a product's price has been trending down, advise waiting. If it's at a historical low, recommend buying now.
4. **Fake Review Warning**: If a product has suspiciously high ratings (4.9+) with few detailed reviews, flag this.
5. **Best Time to Buy**: Recommend optimal purchase timing (e.g., Black Friday for electronics, back-to-school for laptops, Prime Day for headphones).
6. **Alternative Suggestions**: When relevant, suggest comparable alternatives from the catalog.

Response guidelines:
- Use bullet points and emojis for readability
- Be concise but actionable — every sentence should help the user decide
- Always include affiliate shopping links from the context
- Compare store availability AND prices, highlight the best deal
- Add a "🎯 Bottom Line" summary at the end of longer responses
- The affiliate tag is '${affiliateTag}'. Never fabricate links — only use ones from context.
- Remind users to verify final prices at the store.
- If the user asks about reviews, mention that they should look for verified purchase reviews.`;

  try {
    if (client.chat && client.chat.completions) {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((msg) => ({ role: msg.role, content: msg.content })),
          { role: "user", content: `Product context:\n${context}\n\nQuestion: ${question}${productClass ? ` (Scanned class: ${productClass})` : ""}` }
        ]
      });
      responseText = response.choices[0].message.content;
    } else if (client.responses) {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          ...history.map((msg) => ({ role: msg.role, content: msg.content })),
          { role: "user", content: `Product context:\n${context}\n\nQuestion: ${question}${productClass ? ` (Scanned class: ${productClass})` : ""}` }
        ]
      });
      responseText = response.output_text;
    } else {
      responseText = "I'm having trouble connecting to my AI processor, but here is the product data:\n\n" +
        sources.map(s => `- **${s.title}**: ${s.summary}\n  ${buildLinks(s.title)}`).join("\n");
    }
  } catch (err) {
    console.error("OpenAI model generation failed:", err);
    responseText = "Sorry, I encountered an error. Here's product data from the local catalog:\n\n" +
      sources.map(s => `- **${s.title}**: ${s.summary}\n  ${buildLinks(s.title)}`).join("\n");
  }

  return { text: responseText, sources };
}
