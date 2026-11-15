import { useMemo, useState } from "react";

const QUICK_REPLIES = [
  { words: ["detect", "object", "recognize"], reply: "Hold one item in the center of the camera with good lighting. The scanner only shows matches above its confidence threshold; move closer if the label is uncertain." },
  { words: ["price", "deal", "buy", "cost"], reply: "Select a detected object to see its available affiliate matches. Prices are estimates—always verify the retailer price before buying." },
  { words: ["accuracy", "wrong", "correct"], reply: "For the clearest result, use a plain background, avoid glare, show the whole item, and keep it still for a moment. The confidence percentage is the model's estimate, not a guarantee." },
  { words: ["hello", "hi", "hey"], reply: "Hi! I can help you use the scanner, understand confidence scores, and find product matches." }
];

function getReply(input) {
  const words = input.toLowerCase().split(/\W+/);
  const match = QUICK_REPLIES.find((item) => item.words.some((word) => words.includes(word)));
  return match?.reply || "I can help with object detection, confidence scores, product matches, and using the camera. What would you like to know?";
}

export default function Chatbot() {
  const [messages, setMessages] = useState([{ role: "assistant", text: "Welcome! Ask me how to use the object scanner or improve a detection." }]);
  const [draft, setDraft] = useState("");
  const suggestions = useMemo(() => ["How do I improve accuracy?", "What objects can it detect?", "How do I find a deal?"], []);
  const send = (event, preset = draft) => {
    event?.preventDefault();
    const text = preset.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "user", text }, { role: "assistant", text: getReply(text) }]);
    setDraft("");
  };
  return <section className="chatbot-card card"><div className="card-header"><div><p className="section-label">AFFILI-DETECT ASSISTANT</p><h2>How can I help?</h2></div><span className="live-pulse-badge">READY</span></div><div className="chatbot-messages">{messages.map((message, index) => <div className={`chatbot-message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>)}</div><div className="chatbot-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(null, suggestion)}>{suggestion}</button>)}</div><form className="chatbot-form" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about the scanner…" aria-label="Chat message" /><button className="btn btn-primary" disabled={!draft.trim()}>Send</button></form></section>;
}
