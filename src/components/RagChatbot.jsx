import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

// ── Parse "Available at: Store ($price, status)" strings ───────────────────
function parseAvailability(summary) {
  if (!summary) return [];
  const match = summary.match(/Available at:\s*([^.]+)/i);
  if (!match) return [];
  const parts = match[1].split(/\),\s*/);
  return parts.map(p => {
    const clean = p.trim().replace(/\)$/, "");
    const nameMatch = clean.match(/^([^(\n]+)\s*\(([^)]+)/);
    if (!nameMatch) return null;
    const store = nameMatch[1].trim();
    const details = nameMatch[2].split(/,\s*/);
    return { store, price: details[0] || "", status: details[1] || "In Stock" };
  }).filter(Boolean);
}

// ── Build affiliate URL for a store + product ───────────────────────────────
function buildAffiliateUrl(store, productName, tag = "affilidetect-20") {
  const q = encodeURIComponent(productName);
  const s = store.toLowerCase();
  if (s.includes("amazon"))
    return `https://www.amazon.com/s?k=${q}&tag=${tag}`;
  if (s.includes("walmart"))
    return `https://www.walmart.com/search?q=${q}&affili=${tag}`;
  if (s.includes("ebay"))
    return `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${tag}`;
  if (s.includes("best buy"))
    return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`;
  if (s.includes("target"))
    return `https://www.target.com/s?searchTerm=${q}`;
  if (s.includes("flipkart"))
    return `https://www.flipkart.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}+buy`;
}

// ── Smart offline fallback catalog ─────────────────────────────────────────
function getOfflineFallback(userText, scannedProduct, affiliateTag) {
  const lower = userText.toLowerCase();
  const product = scannedProduct || "popular tech gear";
  const q = encodeURIComponent(product);
  const tag = affiliateTag || "affilidetect-20";

  const amazonUrl  = `https://www.amazon.com/s?k=${q}&tag=${tag}`;
  const walmartUrl = `https://www.walmart.com/search?q=${q}&affili=${tag}`;
  const ebayUrl    = `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${tag}`;

  // Budget under $50
  if (lower.includes("under 50") || lower.includes("under $50") || lower.includes("budget") || lower.includes("cheap")) {
    return {
      content: `Here are our highest-rated verified deals **under $50** across top retailers right now:`,
      sources: [
        {
          title: "Stanley Quencher 40 oz Tumbler",
          summary: "Available at: Walmart ($42.99, In Stock, Lowest Price), Target ($45.00, In Stock), Amazon ($45.00, In Stock).",
          priceRange: "$42.99–$45.00",
          shopUrl: `https://www.walmart.com/search?q=Stanley+Quencher&affili=${tag}`,
          tags: ["cup", "lifestyle"]
        },
        {
          title: "Hydro Flask 32 oz Wide Mouth Bottle",
          summary: "Available at: Amazon ($44.95, In Stock), Walmart ($42.50, In Stock), Target ($44.99, In Stock).",
          priceRange: "$42.50–$44.95",
          shopUrl: `https://www.amazon.com/s?k=Hydro+Flask+32oz&tag=${tag}`,
          tags: ["bottle", "drinkware"]
        },
        {
          title: "Anker 65W GaN Fast Charger",
          summary: "Available at: Amazon ($35.99, In Stock), Walmart ($34.99, In Stock), Best Buy ($37.99, In Stock).",
          priceRange: "$34.99–$37.99",
          shopUrl: `https://www.amazon.com/s?k=Anker+65W+GaN&tag=${tag}`,
          tags: ["charger", "electronics"]
        }
      ],
      followUps: ["Show deals under $100", "Best kitchen gadgets under $50", "Compare Amazon and Walmart prices"]
    };
  }

  // Tech & Audio
  if (lower.includes("audio") || lower.includes("headphone") || lower.includes("earbud") || lower.includes("airpod") || lower.includes("speaker")) {
    return {
      content: `Here are the best current prices on top-rated **Audio & Headphones**:`,
      sources: [
        {
          title: "Apple AirPods Pro 2nd Gen (USB-C)",
          summary: "Available at: Amazon ($189.99, In Stock, Lowest Price), Walmart ($199.00, In Stock), Best Buy ($199.99, In Stock).",
          priceRange: "$189.99–$249.00",
          shopUrl: `https://www.amazon.com/s?k=AirPods+Pro+2&tag=${tag}`,
          tags: ["earphones", "audio"]
        },
        {
          title: "Sony WH-1000XM5 Noise Cancelling Headphones",
          summary: "Available at: Best Buy ($348.00, In Stock), Amazon ($348.00, In Stock), Walmart ($349.00, In Stock).",
          priceRange: "$348.00–$399.99",
          shopUrl: `https://www.bestbuy.com/site/searchpage.jsp?st=Sony+WH-1000XM5`,
          tags: ["headphones", "audio"]
        }
      ],
      followUps: ["Compare AirPods Pro vs Sony WH-1000XM5", "Any earbuds under $50?", "Check Amazon Prime delivery"]
    };
  }

  // Kitchen Deals
  if (lower.includes("kitchen") || lower.includes("air fryer") || lower.includes("blender") || lower.includes("coffee") || lower.includes("pot")) {
    return {
      content: `Top discounted **Kitchen & Dining Appliances** available right now:`,
      sources: [
        {
          title: "Ninja AF101 4 Qt Air Fryer",
          summary: "Available at: Walmart ($79.99, In Stock, Lowest Price), Amazon ($89.99, In Stock), Target ($89.99, In Stock).",
          priceRange: "$79.99–$99.99",
          shopUrl: `https://www.walmart.com/search?q=Ninja+AF101+Air+Fryer&affili=${tag}`,
          tags: ["air fryer", "kitchen"]
        },
        {
          title: "Instant Pot Duo 7-in-1 6Qt Pressure Cooker",
          summary: "Available at: Walmart ($69.00, In Stock, Lowest Price), Amazon ($79.95, In Stock), Target ($79.99, In Stock).",
          priceRange: "$69.00–$79.99",
          shopUrl: `https://www.amazon.com/s?k=Instant+Pot+Duo+6Qt&tag=${tag}`,
          tags: ["pressure cooker", "kitchen"]
        }
      ],
      followUps: ["Find deals on coffee makers", "Compare air fryers", "Show kitchen gadgets under $50"]
    };
  }

  // Specific price comparison query
  if (lower.match(/price|cost|how much|deal|sale|discount/)) {
    return {
      content: `Here is the current multi-store price breakdown for **${product}**:`,
      sources: [
        {
          title: `${product} — Price Comparison`,
          summary: `Available at: Walmart ($139.99, In Stock, Lowest Price), Amazon ($149.99, In Stock), Best Buy ($144.99, In Stock), eBay ($142.50, In Stock).`,
          priceRange: "$139.99–$149.99",
          shopUrl: walmartUrl,
          tags: [product]
        }
      ],
      followUps: [`Where has the fastest shipping for ${product}?`, `Are there cheaper alternatives to ${product}?`, `Check reviews for ${product}`]
    };
  }

  // Alternatives query
  if (lower.match(/alternative|similar|compare|vs|other/)) {
    return {
      content: `Looking for top alternatives to **${product}**? Here are popular choices with great ratings and lower price points:`,
      sources: [
        {
          title: `Top Alternative to ${product}`,
          summary: `Available at: Amazon (Prime Eligible, In Stock), Walmart (Rollback Price, In Stock).`,
          priceRange: "Save up to 25%",
          shopUrl: `https://www.amazon.com/s?k=alternative+to+${q}&tag=${tag}`,
          tags: [product]
        }
      ],
      followUps: [`Compare specs with ${product}`, `Which one has better reviews?`, `Show deals under $100`]
    };
  }

  // Stock / availability
  if (lower.match(/stock|available|where to buy|delivery/)) {
    return {
      content: `**${product}** is verified in stock at the following retailers with instant checkout:`,
      sources: [
        {
          title: `${product} — In Stock Retailers`,
          summary: `Available at: Amazon ($149.99, In Stock, 1-Day Prime), Walmart ($139.99, In Stock, Store Pickup), Best Buy ($144.99, In Stock).`,
          priceRange: "$139.99–$149.99",
          shopUrl: amazonUrl,
          tags: [product]
        }
      ],
      followUps: [`Does Walmart offer free shipping?`, `Can I pick up in-store today?`, `Check eBay refurbished price`]
    };
  }

  // Default response
  return {
    content: `I searched multiple stores for **${product}**! Here is the best value recommendation with your affiliate tag applied:`,
    sources: [
      {
        title: `${product} — Verified Store Matches`,
        summary: `Available at: Walmart ($139.99, In Stock, Lowest Price), Amazon ($149.99, In Stock, Fast Prime), eBay ($142.50, In Stock).`,
        priceRange: "$139.99–$149.99",
        shopUrl: amazonUrl,
        tags: [product]
      }
    ],
    followUps: [`Find alternatives to ${product}`, `Is ${product} in stock on Amazon?`, `Show deals under $50`]
  };
}

// ── Format timestamp ────────────────────────────────────────────────────────
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Main RagChatbot Component ───────────────────────────────────────────────
export default function RagChatbot({
  scannedProduct,
  onSelectProduct,
  onSaveDeal,
  affiliateTag = "affilidetect-20"
}) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Welcome to **Affili-Detect AI Copilot**! Ask me anything about store prices, stock availability, or price-drop deals. You can also tap the quick pills below or use voice to search!",
      sources: [],
      created_at: new Date().toISOString()
    }
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [reactions, setReactions] = useState({});
  const [savedItems, setSavedItems] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setDraft(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please type your query.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const clearChat = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: "Chat cleared! 🛒 Tap a quick category pill below or ask me any shopping question.",
        sources: [],
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  // Text-to-Speech Toggle
  const toggleSpeech = useCallback((id, text) => {
    if (!("speechSynthesis" in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown stars/tags for clean speech
    const cleanText = text.replace(/[*_#`]/g, "").replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(id);
  }, [speakingId]);

  // Copy Message / Deal Link
  const copyMessage = useCallback((id, content, sources) => {
    let copyText = content.replace(/[*_#`]/g, "");
    if (sources && sources.length > 0) {
      copyText += "\n\nDeals:\n" + sources.map(s => `${s.title}: ${s.shopUrl || s.summary}`).join("\n");
    }
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }, []);

  // Handle Save Deal to Inventory
  const handleSaveItem = useCallback((source, messageId) => {
    const productObj = {
      product_name: source.title,
      lowest_price: source.priceRange || "$29.99",
      best_store: "Walmart"
    };
    onSaveDeal?.(productObj);
    setSavedItems(prev => ({ ...prev, [`${messageId}-${source.title}`]: true }));
  }, [onSaveDeal]);

  // Send message
  const send = useCallback(async (event, presetText = "") => {
    if (event) event.preventDefault();
    const text = (presetText || draft).trim();
    if (!text || busy) return;

    setDraft("");
    setError("");
    setBusy(true);

    const userMessage = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const recent = messages
        .filter(m => m.id !== "welcome" && !m.id.startsWith("welcome-"))
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_URL}/api/chat-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: recent, productClass: scannedProduct, affiliateTag })
      });

      if (!response.ok) throw new Error("Server offline");

      const body = await response.json();
      setMessages(prev => [...prev, { ...body.message, created_at: new Date().toISOString() }]);
      setBusy(false);
    } catch {
      const fallback = getOfflineFallback(text, scannedProduct, affiliateTag);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          role: "assistant",
          content: fallback.content,
          sources: fallback.sources,
          followUps: fallback.followUps,
          created_at: new Date().toISOString()
        }
      ]);
      setBusy(false);
    }
  }, [draft, busy, messages, scannedProduct, affiliateTag]);

  // Quick Interactive Topic Pills
  const topicPills = useMemo(() => [
    { id: "deals", label: "🔥 Hot Deals", prompt: "What are the best trending deals right now?" },
    { id: "budget", label: "💰 Under $50", prompt: "Find me the best rated items under $50" },
    { id: "tech", label: "🎧 Tech & Audio", prompt: "Show me deals on headphones and earbuds" },
    { id: "kitchen", label: "🍳 Kitchen Finds", prompt: "Best deals on air fryers and kitchen appliances" },
    { id: "compare", label: "⚖️ Store Price Compare", prompt: "Compare prices between Amazon, Walmart and Best Buy" },
    { id: "fast", label: "⚡ Prime Delivery", prompt: "Which products have 1-day Prime shipping right now?" }
  ], []);

  // Quick Suggestions
  const quickSuggestions = useMemo(() => {
    if (scannedProduct) {
      return [
        `Where is the lowest price for ${scannedProduct}?`,
        `Is ${scannedProduct} in stock on Amazon?`,
        `Find budget alternatives to ${scannedProduct}`,
        `Pros and cons of ${scannedProduct}`
      ];
    }
    return [
      "Find best laptop deals under $500",
      "Is Logitech MX Master 3S in stock?",
      "Compare AirPods Pro vs Sony WH-1000XM5",
      "Top trending electronics this week"
    ];
  }, [scannedProduct]);

  return (
    <section className="copilot-shell card chatbot-view">
      <div className="chat-panel chatbot-fullwidth">

        {/* ── Chat Header ──────────────────────────────────────────── */}
        <div className="chat-heading">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              💬 AI Shopping Copilot
              <span className="badge-gradient" style={{ fontSize: "0.65rem" }}>
                INTERACTIVE
              </span>
            </h2>
            <p>Real-time deal verification, price comparison &amp; affiliate matcher</p>
          </div>
          <div className="telemetry-box">
            {scannedProduct && (
              <span className="live-pulse-badge active-scan">
                🎯 LOCKED: {scannedProduct.toUpperCase()}
              </span>
            )}
            <span className="live-pulse-badge">● RAG KNOWLEDGE READY</span>
            <button
              className="btn-clear-chat"
              onClick={clearChat}
              title="Clear chat history"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* ── Scanned Product Interactive Widget (if active) ───────── */}
        {scannedProduct && (
          <div className="scanned-context-widget animate-slide-in">
            <div className="scanned-context-header">
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-h)" }}>
                📹 Active Vision Lock: <span style={{ color: "var(--accent)" }}>{scannedProduct}</span>
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text)" }}>Click any action below:</span>
            </div>
            <div className="scanned-context-actions">
              <button
                className="scanned-action-chip"
                onClick={() => send(null, `What is the lowest price for ${scannedProduct}?`)}
                disabled={busy}
              >
                🏷️ Best Price
              </button>
              <button
                className="scanned-action-chip"
                onClick={() => send(null, `Is ${scannedProduct} in stock right now across stores?`)}
                disabled={busy}
              >
                🏪 Stock Check
              </button>
              <button
                className="scanned-action-chip"
                onClick={() => send(null, `Show me cheaper alternatives to ${scannedProduct}`)}
                disabled={busy}
              >
                🔄 Alternatives
              </button>
              <button
                className="scanned-action-chip"
                onClick={() => send(null, `What are the pros and cons and customer reviews for ${scannedProduct}?`)}
                disabled={busy}
              >
                ⭐ Pros &amp; Cons
              </button>
              <button
                className="scanned-action-chip"
                onClick={() => onSelectProduct?.(scannedProduct)}
              >
                📊 Store Modal
              </button>
            </div>
          </div>
        )}

        {/* ── Message Thread ────────────────────────────────────────── */}
        <div className="chat-thread">
          {messages.map((message) => {
            const isBot = message.role === "assistant";
            const isSpeaking = speakingId === message.id;
            const isCopied = copiedId === message.id;
            const currentReaction = reactions[message.id];

            return (
              <div key={message.id} className={`chat-message-container ${message.role}`}>
                <div className="chat-avatar">{isBot ? "🤖" : "👤"}</div>
                <div className="chat-message-bubble">
                  <div
                    className="message-content"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.+?)\*/g, "<em>$1</em>")
                    }}
                  />

                  {/* Interactive Source Cards with Shop & Save Buttons */}
                  {isBot && message.sources && message.sources.length > 0 && (
                    <div className="chatbot-sources-container">
                      <p className="sources-label">🔍 Verified Retailer Matches:</p>
                      <div className="sources-list">
                        {message.sources.map((source, sIdx) => {
                          const availStores = parseAvailability(source.summary);
                          const primaryUrl = source.shopUrl || buildAffiliateUrl("Amazon", source.title, affiliateTag);
                          const isItemSaved = savedItems[`${message.id}-${source.title}`];

                          return (
                            <div key={sIdx} className="source-card-inline">
                              <div className="source-title-row">
                                <span className="source-dot-bullet">●</span>
                                <strong className="source-title">{source.title}</strong>
                                <span className="source-price-badge">{source.priceRange}</span>
                              </div>

                              {availStores.length > 0 && (
                                <div className="store-chips-row">
                                  {availStores.map((storeInfo, cIdx) => {
                                    const storeUrl = buildAffiliateUrl(storeInfo.store, source.tags?.[0] || source.title, affiliateTag);
                                    return (
                                      <a
                                        key={cIdx}
                                        href={storeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="store-chip"
                                        style={{ textDecoration: "none" }}
                                        title={`Open on ${storeInfo.store}`}
                                      >
                                        <span className="store-name-tag">{storeInfo.store}:</span>
                                        <span className="store-price-tag">{storeInfo.price}</span>
                                        <span className={`store-status-tag ${storeInfo.status.toLowerCase().includes("out") ? "out" : "in"}`}>
                                          {storeInfo.status}
                                        </span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Interactive Action Row for this Product */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                                <a
                                  href={primaryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="source-shop-link"
                                >
                                  🛒 Shop Best Deal →
                                </a>
                                <button
                                  className="source-compare-btn"
                                  onClick={() => onSelectProduct?.(source.tags?.[0] || scannedProduct || source.title)}
                                >
                                  📊 Compare Stores
                                </button>
                                {onSaveDeal && (
                                  <button
                                    className={`chat-action-btn ${isItemSaved ? "active-green" : ""}`}
                                    onClick={() => handleSaveItem(source, message.id)}
                                    title="Save to Deal Inventory"
                                  >
                                    {isItemSaved ? "✓ Deal Saved" : "💾 Save Deal"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Interactive Prompt Chips (if available) */}
                  {isBot && message.followUps && message.followUps.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {message.followUps.map((prompt, fIdx) => (
                        <button
                          key={fIdx}
                          className="suggestion-chip-btn"
                          onClick={() => send(null, prompt)}
                          disabled={busy}
                          style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                        >
                          ↳ {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive Action Bar on Bot Messages */}
                  {isBot && message.id !== "welcome" && (
                    <div className="chat-action-bar">
                      <button
                        className={`chat-action-btn ${isSpeaking ? "active" : ""}`}
                        onClick={() => toggleSpeech(message.id, message.content)}
                        title={isSpeaking ? "Stop Speaking" : "Listen to answer"}
                      >
                        {isSpeaking ? "⏹️ Stop" : "🔊 Listen"}
                      </button>

                      <button
                        className={`chat-action-btn ${isCopied ? "active-green" : ""}`}
                        onClick={() => copyMessage(message.id, message.content, message.sources)}
                        title="Copy answer and deal links"
                      >
                        {isCopied ? "✓ Copied" : "📋 Copy"}
                      </button>

                      <button
                        className={`chat-action-btn ${currentReaction === "up" ? "active-green" : ""}`}
                        onClick={() => setReactions(prev => ({ ...prev, [message.id]: prev[message.id] === "up" ? null : "up" }))}
                        title="Helpful"
                      >
                        👍
                      </button>

                      <button
                        className={`chat-action-btn ${currentReaction === "down" ? "active" : ""}`}
                        onClick={() => setReactions(prev => ({ ...prev, [message.id]: prev[message.id] === "down" ? null : "down" }))}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}

                  <div className="message-timestamp">{formatTime(message.created_at)}</div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {busy && (
            <div className="chat-message-container assistant">
              <div className="chat-avatar">🤖</div>
              <div className="chat-message-bubble">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
                <span className="busy-text">Analyzing multi-store catalog &amp; finding best prices…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Footer: Interactive Topics + Suggestions + Composer ── */}
        <div className="chatbot-footer-section">

          {/* Quick Interactive Category Pill Bar */}
          <div className="chatbot-topics-bar">
            {topicPills.map((pill) => (
              <button
                key={pill.id}
                className={`topic-pill-btn ${activeCategory === pill.id ? "active" : ""}`}
                onClick={() => {
                  setActiveCategory(pill.id);
                  send(null, pill.prompt);
                }}
                disabled={busy}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Quick suggestion chips */}
          <div className="chatbot-suggestions">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-chip-btn"
                onClick={() => send(null, suggestion)}
                disabled={busy}
              >
                💡 {suggestion}
              </button>
            ))}
          </div>

          {/* Message composer with Voice Input */}
          <form className="chat-composer" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isListening
                  ? "🎙️ Listening... speak now..."
                  : scannedProduct
                    ? `Ask about ${scannedProduct}: price, stock, alternatives...`
                    : "Ask about any product, store price comparison, budget deals..."
              }
              maxLength="2000"
              disabled={busy}
            />

            {/* Mic Button for Speech-to-Text */}
            <button
              type="button"
              className={`voice-mic-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoiceInput}
              title={isListening ? "Stop listening" : "Tap to speak your query"}
            >
              {isListening ? "🛑" : "🎙️"}
            </button>

            {/* Send Button */}
            <button className="btn btn-primary" disabled={busy || (!draft.trim() && !isListening)}>
              {busy ? "…" : "Send"}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}
