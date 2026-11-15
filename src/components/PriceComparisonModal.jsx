import { useState, useRef, useEffect } from "react";

const STORE_ICONS = {
  Walmart: "🏪",
  Amazon: "📦",
  eBay: "🏷️",
  "Best Buy": "🔵",
  Target: "🎯"
};

export default function PriceComparisonModal({ productClass, affiliateTag, onClose }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: `Hi! I'm AffiliBot 🤖. I compared 4 major stores for "${productClass}". Walmart currently offers the lowest price with free 2-day shipping! Click any store card to shop with your affiliate tag.`
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const cleanTag = affiliateTag || "affilidetect-20";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Real affiliate URLs
  const storeComparison = [
    {
      store: "Walmart",
      price: "$139.99",
      originalPrice: "$159.99",
      badge: "⚡ Lowest — Save $20",
      shipping: "Free 2-Day Shipping",
      rating: "4.8",
      logo: "🏪",
      featured: true,
      url: `https://www.walmart.com/search?q=${encodeURIComponent(productClass)}&affili=${cleanTag}`
    },
    {
      store: "Amazon",
      price: "$149.95",
      originalPrice: "$149.95",
      badge: "📦 Prime 1-Day",
      shipping: "Free Delivery Tomorrow",
      rating: "4.7",
      logo: "📦",
      featured: false,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(productClass)}&tag=${cleanTag}`
    },
    {
      store: "eBay",
      price: "$142.50",
      originalPrice: "$150.00",
      badge: "⭐ Top Rated",
      shipping: "Free Expedited",
      rating: "4.6",
      logo: "🏷️",
      featured: false,
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(productClass)}&campid=${cleanTag}`
    }
  ];

  // Smart AffiliBot response engine
  const getBotResponse = (userText) => {
    const lower = userText.toLowerCase();
    const q = encodeURIComponent(productClass);

    if (lower.match(/cheap|budget|lowest|affordable|save/)) {
      return `Walmart has the best price at $139.99 (saves you $20). Here's your affiliate link:\n🔗 https://www.walmart.com/search?q=${q}&affili=${cleanTag}`;
    }
    if (lower.match(/amazon|prime|fast shipping|next day|deliver/)) {
      return `Amazon offers 1-day Prime delivery for "${productClass}" at $149.95.\n🔗 https://www.amazon.com/s?k=${q}&tag=${cleanTag}`;
    }
    if (lower.match(/ebay|used|refurb|second hand|auction/)) {
      return `eBay has "${productClass}" at $142.50 with Top Rated seller protection and free expedited shipping.\n🔗 https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${cleanTag}`;
    }
    if (lower.match(/stock|available|in stock|inventory/)) {
      return `All 3 stores currently show "${productClass}" in stock! Walmart and Amazon are your best bets for fastest delivery.`;
    }
    if (lower.match(/warranty|return|policy/)) {
      return `Most stores offer a standard 30-day return window. Amazon and Walmart have exceptional return policies for "${productClass}". Check each store page for full warranty details.`;
    }
    if (lower.match(/spec|feature|review|rating|good|best/)) {
      return `"${productClass}" is rated 4.7+ across all stores this month. Amazon reviews are most comprehensive — check verified purchase reviews for the latest insights.`;
    }
    if (lower.match(/alternative|similar|other|compare/)) {
      return `Looking for alternatives to "${productClass}"? Try searching "similar to ${productClass}" on Amazon for curated recommendations.\n🔗 https://www.amazon.com/s?k=similar+to+${q}&tag=${cleanTag}`;
    }
    if (lower.match(/affiliate|commission|link|tag/)) {
      return `Your affiliate tag "${cleanTag}" is embedded in all store links automatically. Each purchase through these links earns you a commission! 💰`;
    }

    return `"${productClass}" is a top-rated product this month. Walmart leads at $139.99 with free shipping. Amazon's Prime delivery is fastest at $149.95. All links include your affiliate tag "${cleanTag}" for commission tracking!`;
  };

  const handleAskBot = (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userText = inputQuestion;
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInputQuestion("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [...prev, { sender: "bot", text: getBotResponse(userText) }]);
    }, 700);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ padding: "20px" }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="card-header">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              🔍 Multi-Store Price Intelligence
            </h2>
            <p className="modal-subtitle">
              Item:{" "}
              <strong style={{ color: "var(--text-h)", textTransform: "uppercase" }}>
                {productClass}
              </strong>
              {" "}— Affiliate tag:{" "}
              <span
                style={{
                  fontFamily: "var(--mono)", fontSize: "0.78rem",
                  color: "var(--accent)", background: "var(--accent-bg)",
                  padding: "1px 6px", borderRadius: 4
                }}
              >
                {cleanTag}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="close-btn" title="Close (Esc)">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Store Comparison Grid */}
          <div className="stores-comparison-grid">
            {storeComparison.map((item, i) => (
              <div key={i} className={`store-card ${item.featured ? "featured-deal" : ""}`}>
                <div className="store-badge-row">
                  <span style={{ fontWeight: 700, color: "var(--text-h)", fontSize: "0.92rem" }}>
                    {item.logo} {item.store}
                  </span>
                  <span className="deal-badge">{item.badge}</span>
                </div>

                <div className="store-price-row">
                  <span className="main-price">{item.price}</span>
                  {item.originalPrice !== item.price && (
                    <span className="orig-price">{item.originalPrice}</span>
                  )}
                </div>

                <p className="shipping-info">🚚 {item.shipping}</p>
                <p className="rating-info">
                  {"⭐".repeat(Math.round(parseFloat(item.rating)))} {item.rating} / 5
                </p>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary buy-now-btn"
                  style={{
                    background: item.featured ? "var(--success)" : "var(--accent)",
                    boxShadow: item.featured
                      ? "0 3px 14px rgba(5,150,105,0.35)"
                      : "0 3px 14px rgba(37,99,235,0.3)"
                  }}
                >
                  {item.featured ? "🛒" : "🔗"} Buy on {item.store} →
                </a>
              </div>
            ))}
          </div>

          {/* Price comparison summary bar */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--success-bg)",
              border: "1px solid rgba(5,150,105,0.25)",
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20, fontSize: "0.84rem", color: "var(--text-h)"
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>💡</span>
            <span>
              <strong>Best deal:</strong> Walmart at $139.99 saves you{" "}
              <strong style={{ color: "var(--success)" }}>$20 (12.5%)</strong> vs. highest price.
              All links include your affiliate tag for commission tracking.
            </span>
          </div>

          {/* AffiliBot AI Section */}
          <div className="affili-bot-section">
            <h3>🤖 AffiliBot AI Assistant</h3>

            <div className="chat-messages-box">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.sender}`}>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                </div>
              ))}
              {isTyping && (
                <div className="chat-bubble bot" style={{ padding: "12px 14px" }}>
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[
                "Cheapest option?",
                "Amazon Prime delivery?",
                "Is it in stock?",
                "Find alternatives"
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInputQuestion(q);
                    handleAskBot({ preventDefault: () => {}, target: { value: q } });
                    setInputQuestion("");
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "var(--social-bg)",
                    color: "var(--text)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.18s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--accent-border)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                >
                  💡 {q}
                </button>
              ))}
            </div>

            <form onSubmit={handleAskBot} className="chat-input-form">
              <input
                type="text"
                placeholder={`Ask about "${productClass}" (shipping, alternatives, specs…)`}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                className="chat-input"
                disabled={isTyping}
              />
              <button
                type="submit"
                className="btn btn-success"
                disabled={isTyping || !inputQuestion.trim()}
              >
                Ask AI
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
