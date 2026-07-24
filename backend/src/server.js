import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import db from "./db.js";
import { login, register, requireAuth } from "./auth.js";
import { answer } from "./rag.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
const requests = new Map();

app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const recent = (requests.get(key) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 60) return res.status(429).json({ error: "Too many requests. Try again in a minute." });
  recent.push(now); requests.set(key, recent); next();
});
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => db.prepare("INSERT INTO request_logs (id, user_id, route, status_code, duration_ms) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), req.user?.sub || null, req.path, res.statusCode, Date.now() - started));
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.post("/api/auth/register", async (req, res, next) => {
  try { res.status(201).json(await register(req.body.email || "", req.body.password || "")); } catch (error) { next(error); }
});
app.post("/api/auth/login", async (req, res, next) => {
  try { res.json(await login(req.body.email || "", req.body.password || "")); } catch (error) { next(error); }
});
app.get("/api/conversations", requireAuth, (req, res) => {
  const conversations = db.prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(req.user.sub);
  res.json({ conversations });
});
app.get("/api/conversations/:id/messages", requireAuth, (req, res) => {
  const conversation = db.prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.sub);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  const messages = db.prepare("SELECT id, role, content, sources_json, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at").all(req.params.id)
    .map((message) => ({ ...message, sources: message.sources_json ? JSON.parse(message.sources_json) : [] }));
  return res.json({ messages });
});
app.post("/api/chat", requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.message || "").trim();
    if (!text || text.length > 2000) return res.status(400).json({ error: "Message must be between 1 and 2,000 characters." });
    let conversationId = req.body.conversationId;
    if (!conversationId) {
      conversationId = randomUUID();
      db.prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)").run(conversationId, req.user.sub, text.slice(0, 72));
    }
    const ownsConversation = db.prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(conversationId, req.user.sub);
    if (!ownsConversation) return res.status(404).json({ error: "Conversation not found." });
    const history = db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10").all(conversationId).reverse();
    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)").run(randomUUID(), conversationId, text);
    const result = await answer(text, history);
    const assistantMessage = { id: randomUUID(), role: "assistant", content: result.text, sources: result.sources, created_at: new Date().toISOString() };
    db.prepare("INSERT INTO messages (id, conversation_id, role, content, sources_json) VALUES (?, ?, 'assistant', ?, ?)")
      .run(assistantMessage.id, conversationId, assistantMessage.content, JSON.stringify(result.sources));
    db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
    res.json({ conversationId, message: assistantMessage });
  } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : "Something went wrong. Please try again." });
});

app.listen(port, () => console.log(`Affili-Detect API listening on ${port}`));
