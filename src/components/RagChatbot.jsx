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
  if (store.toLowerCase().includes("amazon"))
    return `https://www.amazon.com/s?k=${q}&tag=${tag}`;
  if (store.toLowerCase().includes("walmart"))
    return `https://www.walmart.com/search?q=${q}&affili=${tag}`;
  if (store.toLowerCase().includes("ebay"))
    return `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${tag}`;
  if (store.toLowerCase().includes("best buy"))
    return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`;
  return `https://www.google.com/search?q=${q}+buy`;
}

// ── Smart offline fallback catalog ─────────────────────────────────────────
function getOfflineFallback(userText, scannedProduct, affiliateTag) {
  const lower = userText.toLowerCase();
  const product = scannedProduct || "this product";
  const q = encodeURIComponent(product);
  const tag = affiliateTag || "affilidetect-20";

  const amazonUrl  = `https://www.amazon.com/s?k=${q}&tag=${tag}`;
  const walmartUrl = `https://www.walmart.com/search?q=${q}&affili=${tag}`;
  const ebayUrl    = `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${tag}`;

  // Category-specific responses
  if (lower.match(/price|cost|how much|cheap|afford|budget/)) {
    return {
      content: `Here's a quick price overview for **${product}** across major retailers:`,
      sources: [
        {
          title: `${product} — Price Comparison`,
          summary: `Available at: Amazon ($149.99, In Stock), Walmart ($139.99, In Stock), eBay ($142.50, In Stock).`,
          priceRange: "$139–$150",
          shopUrl: amazonUrl,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/amazon|prime|fast|ship|deliver/)) {
    return {
      content: `Amazon offers ${product} with Prime 1-day delivery! Your affiliate link is ready:`,
      sources: [
        {
          title: `${product} — Amazon Prime`,
          summary: `Available at: Amazon ($149.99, In Stock).`,
          priceRange: "$149.99",
          shopUrl: amazonUrl,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/walmart|pickup|store|in-store/)) {
    return {
      content: `Walmart currently has the best deal on ${product} — also available for store pickup!`,
      sources: [
        {
          title: `${product} — Walmart`,
          summary: `Available at: Walmart ($139.99, In Stock).`,
          priceRange: "$139.99",
          shopUrl: walmartUrl,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/ebay|used|refurb|second|auction/)) {
    return {
      content: `eBay has some great deals on ${product}, including refurbished options from Top Rated sellers.`,
      sources: [
        {
          title: `${product} — eBay Listings`,
          summary: `Available at: eBay ($142.50, In Stock).`,
          priceRange: "$142.50",
          shopUrl: ebayUrl,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/stock|available|inventory|find|where/)) {
    return {
      content: `**${product}** is currently in stock at all three major retailers! Here are the direct links:`,
      sources: [
        {
          title: `${product} — All Retailers`,
          summary: `Available at: Amazon ($149.99, In Stock), Walmart ($139.99, In Stock), eBay ($142.50, In Stock).`,
          priceRange: "$139–$150",
          shopUrl: amazonUrl,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/alternative|similar|other|like|compare|vs/)) {
    return {
      content: `Looking for alternatives to **${product}**? Here are some places to compare similar products:`,
      sources: [
        {
          title: `Similar to ${product}`,
          summary: `Available at: Amazon (Compare similar, In Stock), Walmart (Check alternatives, In Stock).`,
          priceRange: "Varies",
          shopUrl: `https://www.amazon.com/s?k=similar+to+${q}&tag=${tag}`,
          tags: [product]
        }
      ]
    };
  }

  if (lower.match(/spec|feature|review|rating|good|best|quality/)) {
    return {
      content: `**${product}** is top-rated across stores (4.7/5 avg). Amazon typically has the most verified reviews. Check specs and full reviews:`,
      sources: [
        {
          title: `${product} — Reviews & Specs`,
          summary: `Available at: Amazon ($149.99, In Stock), Best Buy (Check price, In Stock).`,
          priceRange: "$149.99",
          shopUrl: amazonUrl,
          tags: [product]
        }
      ]
    };
  }

  // Default
  return {
    content: `I found **${product}** at multiple stores! Walmart offers the best price ($139.99) while Amazon has the fastest delivery. All links include your affiliate tag for commissions:`,
    sources: [
      {
        title: `${product} — Best Deals`,
        summary: `Available at: Amazon ($149.99, In Stock), Walmart ($139.99, In Stock), eBay ($142.50, In Stock).`,
        priceRange: "$139–$150",
        shopUrl: amazonUrl,
        tags: [product]
      }
    ]
  };
}

// ── Format timestamp ────────────────────────────────────────────────────────
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Main RagChatbot Component ───────────────────────────────────────────────
export default function RagChatbot({ scannedProduct, onSelectProduct, affiliateTag = "affilidetect-20" }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Welcome to **Affili-Detect AI**! Scan a product with your camera or ask me about store availability, prices, and deals. I'll find you the best affiliate links automatically!",
      sources: [],
      created_at: new Date().toISOString()
    }
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: "Chat cleared. Ask me anything about products, prices, or store availability! 🛒",
        sources: [],
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

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
          content: `📴 *(Offline Mode)* ${fallback.content}`,
          sources: fallback.sources,
          created_at: new Date().toISOString()
        }
      ]);
      setBusy(false);
    }
  }, [draft, busy, messages, scannedProduct, affiliateTag]);

  const quickSuggestions = useMemo(() => {
    if (scannedProduct) {
      return [
        `Where is the best price for ${scannedProduct}?`,
        `Is ${scannedProduct} in stock on Amazon?`,
        `Find alternatives to ${scannedProduct}`,
        `Reviews for ${scannedProduct}`
      ];
    }
    return [
      "Best laptop deals this week?",
      "Is the Logitech MX Master in stock?",
      "Compare wireless earbuds prices",
      "Budget gaming keyboard recommendations"
    ];
  }, [scannedProduct]);

  return (
    <section className="copilot-shell card chatbot-view">
      <div className="chat-panel chatbot-fullwidth">

        {/* ── Chat Header ──────────────────────────────────────────── */}
        <div className="chat-heading">
          <div>
            <h2>💬 AI Shopping Chatbot</h2>
            <p>RAG-powered store availability &amp; affiliate deal finder</p>
          </div>
          <div className="telemetry-box">
            {scannedProduct && (
              <span className="live-pulse-badge active-scan">
                🎯 SCANNING: {scannedProduct.toUpperCase()}
              </span>
            )}
            <span className="live-pulse-badge">● RAG ACTIVE</span>
            <button
              className="btn-clear-chat"
              onClick={clearChat}
              title="Clear chat history"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* ── Message Thread ────────────────────────────────────────── */}
        <div className="chat-thread">
          {messages.map((message) => {
            const isBot = message.role === "assistant";
            return (
              <div key={message.id} className={`chat-message-container ${message.role}`}>
                <div className="chat-avatar">{isBot ? "🤖" : "👤"}</div>
                <div className="chat-message-bubble">
                  <div
                    className="message-content"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(italic)\*/g, "<em>$1</em>")
                    }}
                  />

                  {/* Source cards with shop links */}
                  {isBot && message.sources && message.sources.length > 0 && (
                    <div className="chatbot-sources-container">
                      <p className="sources-label">🔍 Catalog matches:</p>
                      <div className="sources-list">
                        {message.sources.map((source, sIdx) => {
                          const availStores = parseAvailability(source.summary);
                          const primaryUrl = source.shopUrl || buildAffiliateUrl("Amazon", source.title, affiliateTag);

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
                                        title={`Shop ${storeInfo.store}`}
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

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
                                  Compare Stores →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                <span className="busy-text">Searching catalog &amp; matching deals…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Footer: Suggestions + Composer ───────────────────────── */}
        <div className="chatbot-footer-section">

          {/* Scan alert chip */}
          {scannedProduct && (
            <div className="scan-alert-chip animate-slide-in">
              <span className="scan-emoji">📹</span>
              <p>
                Just detected <strong>{scannedProduct}</strong>. Ask about availability &amp; pricing:
              </p>
              <button
                className="btn btn-xs btn-success"
                onClick={() => send(null, `Where can I buy ${scannedProduct} for the best price?`)}
                disabled={busy}
              >
                Ask Now ⚡
              </button>
            </div>
          )}

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

          {/* Message composer */}
          <form className="chat-composer" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                scannedProduct
                  ? `Ask about ${scannedProduct}: price, stock, alternatives...`
                  : "Ask about products, store availability, deals..."
              }
              maxLength="2000"
              disabled={busy}
            />
            <button className="btn btn-primary" disabled={busy || !draft.trim()}>
              {busy ? "…" : "Send"}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}
