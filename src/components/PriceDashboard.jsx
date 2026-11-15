import { useState, useEffect, useRef } from "react";

export default function PriceDashboard({ product, onSaveDeal, onVoiceFeedback, affiliateTag = "affilidetect-20" }) {
  const [copied, setCopied] = useState(false);

  const hasSpokenRef = useRef(false);
  const lastSpokenRef = useRef(0);

  // Safely extract properties if product is null to avoid crash during hooks execution
  const { product_name = "", lowest_price = "", highest_price = "", discount_pct = 0, best_store = "", category = "", deals = [] } = product || {};

  const buildShopUrl = (store, productName) => {
    if (!productName) return "";
    const q = encodeURIComponent(productName);
    if (store === "Amazon") return `https://www.amazon.com/s?k=${q}&tag=${affiliateTag}`;
    if (store === "Walmart") return `https://www.walmart.com/search?q=${q}&affili=${affiliateTag}`;
    if (store === "eBay") return `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${affiliateTag}`;
    return `https://www.google.com/search?q=${q}+buy`;
  };

  const bestShopUrl = buildShopUrl(best_store, product_name);

  const handleCopyLink = () => {
    if (!bestShopUrl) return;
    navigator.clipboard.writeText(bestShopUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ✅ FIXED VOICE FUNCTION
  const triggerVoice = () => {
    const now = Date.now();
    if (!product_name) return;

    if (
      onVoiceFeedback &&
      !hasSpokenRef.current &&
      now - lastSpokenRef.current > 3000
    ) {
      onVoiceFeedback(
        `Best price found for ${ product_name } is ${ lowest_price } on ${ best_store }`
      );

      hasSpokenRef.current = true;
      lastSpokenRef.current = now;
    }
  };

  // ✅ AUTO TRIGGER WHEN PRODUCT CHANGES (Must be declared before early return)
  useEffect(() => {
    if (product) {
      hasSpokenRef.current = false;
      triggerVoice();
    }
  }, [product]);

  if (!product) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: 280, padding: 32,
          border: "1px solid var(--border)", borderRadius: 20,
          background: "var(--social-bg)", textAlign: "center",
          gap: 12
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: "50%",
            border: "2px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, animation: "pulse 2s infinite ease-in-out"
          }}
        >
          🔍
        </div>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--text-h)" }}>
          No active lock-on detected.
        </p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text)" }}>
          Focus your camera on a product to begin live comparisons.
        </p>
      </div>
    );
  }

  const STORE_ICONS = {
    Amazon: "📦",
    eBay: "🏷️",
    Walmart: "🏪",
    "Best Buy": "🔵",
    Target: "🎯"
  };

  return (
    <div className="card cyberpunk-border" style={{ padding: 24, textAlign: "left", width: "100%", height: "100%" }}>
      {/* Product Summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{
            fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", padding: "3px 8px", background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)", borderRadius: 6, color: "var(--accent)"
          }}>
            {category || "Product"}
          </span>
          <h2 style={{ margin: "8px 0 4px", fontSize: "1.35rem", fontWeight: 800, color: "var(--text-h)" }}>
            {product_name}
          </h2>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text)" }}>
            Detected Category: <strong style={{ color: "var(--text-h)" }}>{category || "Uncategorized"}</strong>
          </p>
        </div>

        {discount_pct > 0 && (
          <div style={{
            background: "var(--success-bg)", border: "1px solid rgba(5, 150, 105, 0.25)",
            borderRadius: 12, padding: "8px 14px", textAlign: "right"
          }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--success)" }}>
              Max Savings
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)" }}>
              💰 {discount_pct}% OFF
            </div>
          </div>
        )}
      </div>

      {/* Best Deal Highlight Banner */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--success-bg)",
          border: "1px solid rgba(5, 150, 105, 0.25)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          fontSize: "0.82rem",
          color: "var(--text-h)"
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>💡</span>
        <span>
          <strong>Best Deal Lock-on:</strong> Buy from <strong>{best_store}</strong> for <strong style={{ color: "var(--success)" }}>{lowest_price}</strong>.
        </span>
      </div>

      {/* Store Comparison List */}
      <div className="product-cards-list" style={{ marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Available Store Offers</p>
        {deals && deals.length > 0 ? (
          deals.map((deal, idx) => (
            <div key={idx} className={`product-card ${deal.store === best_store ? "featured-deal" : ""}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px",
              border: `1px solid ${deal.store === best_store ? "var(--success)" : "var(--border)"}`,
              background: deal.store === best_store ? "linear-gradient(135deg, var(--success-bg), var(--bg-surface))" : "var(--bg-surface)"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--text-h)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                  {STORE_ICONS[deal.store] || "🏪"} {deal.store}
                  {deal.store === best_store && (
                    <span style={{
                      fontSize: "0.6rem", background: "var(--success)", color: "#fff",
                      padding: "1px 6px", borderRadius: 4, fontWeight: 700
                    }}>
                      BEST DEAL
                    </span>
                  )}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>
                  🚚 {deal.shipping || "Shipping rates vary"}
                </span>
                {deal.badge && (
                  <span style={{ alignSelf: "flex-start", fontSize: "0.68rem", color: "var(--success)", fontWeight: 600 }}>
                    {deal.badge}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: deal.store === best_store ? "var(--success)" : "var(--text-h)" }}>
                  {deal.price}
                </span>
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-primary"
                  style={{
                    background: deal.store === best_store ? "var(--success)" : "var(--accent)",
                    color: "#fff",
                    textDecoration: "none"
                  }}
                >
                  Shop Offer →
                </a>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontStyle: "italic" }}>
            No live store deals mapped for this target.
          </p>
        )}
      </div>

      {/* Control Buttons Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <button className="btn btn-ghost" onClick={handleCopyLink} style={{ flexGrow: 1 }}>
          {copied ? "✅ Link Copied!" : "🔗 Copy Affiliate Link"}
        </button>

        <button className="btn btn-ghost" onClick={triggerVoice} style={{ flexGrow: 1 }}>
          🔊 Speak Telemetry
        </button>

        <button className="btn btn-primary" onClick={() => onSaveDeal?.(product)} style={{ flexGrow: 1 }}>
          💾 Save Inventory Deal
        </button>
      </div>
    </div>
  );
}