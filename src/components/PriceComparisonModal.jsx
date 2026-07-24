import { useState } from "react";

export default function PriceComparisonModal({ productClass, affiliateTag, onClose }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: `Hi! I'm AffiliBot 🤖. I compared 4 major stores for "${productClass}". Walmart currently offers the lowest price with free 2-day shipping!`
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState("");

  const cleanTag = affiliateTag || "affilidetect-20";

  // Mock store price comparison data
  const storeComparison = [
    {
      store: "Walmart",
      price: "$139.99",
      originalPrice: "$159.99",
      badge: "⚡ Lowest Price - Save $20",
      shipping: "Free 2-Day Shipping",
      rating: "4.8 / 5",
      logo: "🏪",
      url: `https://www.walmart.com/search?q=${encodeURIComponent(productClass)}&affili=${cleanTag}`
    },
    {
      store: "Amazon",
      price: "$149.95",
      originalPrice: "$149.95",
      badge: "📦 Prime 1-Day",
      shipping: "Free Delivery Tomorrow",
      rating: "4.7 / 5",
      logo: "📦",
      url: `https://www.amazon.com/s?k=${encodeURIComponent(productClass)}&tag=${cleanTag}`
    },
    {
      store: "eBay",
      price: "$142.50",
      originalPrice: "$150.00",
      badge: "⭐ Top Rated Seller",
      shipping: "Free Expedited Shipping",
      rating: "4.6 / 5",
      logo: "🏷️",
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(productClass)}&campid=${cleanTag}`
    }
  ];

  const handleAskBot = (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userText = inputQuestion;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputQuestion("");

    // Simulate AI response
    setTimeout(() => {
      let botResponse = `Great choice! "${productClass}" is a top seller this month. It's compatible with all major devices and comes with a 1-year manufacturer warranty.`;
      if (userText.toLowerCase().includes("cheap") || userText.toLowerCase().includes("alternative")) {
        botResponse = `If you're looking for a budget alternative to "${productClass}", check out Walmart's current sale at $139.99!`;
      }
      setChatMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container card cyberpunk-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header card-header">
          <div>
            <h2>🔍 Multi-Store Price Intelligence</h2>
            <p className="modal-subtitle">Item: <strong>{productClass.toUpperCase()}</strong></p>
          </div>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          {/* Store Comparison Grid */}
          <div className="stores-comparison-grid">
            {storeComparison.map((item, i) => (
              <div key={i} className={`store-card ${i === 0 ? "featured-deal" : ""}`}>
                <div className="store-badge-row">
                  <span className="store-logo">{item.logo} {item.store}</span>
                  <span className="deal-badge">{item.badge}</span>
                </div>
                <div className="store-price-row">
                  <span className="main-price">{item.price}</span>
                  <span className="orig-price">{item.originalPrice}</span>
                </div>
                <p className="shipping-info">🚚 {item.shipping}</p>
                <p className="rating-info">⭐ Rating: {item.rating}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary buy-now-btn"
                >
                  Buy on {item.store} (Affiliate Link) →
                </a>
              </div>
            ))}
          </div>

          {/* AI Shopping Copilot ("AffiliBot") */}
          <div className="affili-bot-section">
            <h3>🤖 AffiliBot AI Shopping Assistant</h3>
            <div className="chat-messages-box">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.sender}`}>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAskBot} className="chat-input-form">
              <input
                type="text"
                placeholder="Ask AffiliBot (e.g., Is this compatible? Show alternatives)..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                className="chat-input"
              />
              <button type="submit" className="btn btn-success">Ask AI</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
