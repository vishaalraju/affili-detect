import React, { useState, useEffect, useCallback } from "react";
import WebcamScanner from "./components/WebcamScanner";
import MediaScanner from "./components/MediaScanner";
import CreatorStudio from "./components/CreatorStudio";
import RagChatbot from "./components/RagChatbot";
import PriceComparisonModal from "./components/PriceComparisonModal";
import ScannerControls from "./components/ScannerControls";
import PriceDashboard from "./components/PriceDashboard";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("webcam");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("affili-detect-theme") || "dark";
  });
  const [affiliateTag, setAffiliateTag] = useState("affilidetect-20");

  // Vision pipeline controls
  const [yoloEnabled, setYoloEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(65);

  // Product state
  const [activeProduct, setActiveProduct] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [savedDeals, setSavedDeals] = useState([]);
  const [modalProductClass, setModalProductClass] = useState(null);

  // One-time detection notification
  const [notification, setNotification] = useState(null);

  // Read URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    if (tag) setAffiliateTag(tag);
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("affili-detect-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(curr => curr === "dark" ? "light" : "dark");

  // Voice synthesis
  const speakDeal = useCallback((text) => {
    if (!voiceEnabled) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled]);

  const handleProductMatched = useCallback((product) => {
    setActiveProduct(prev => {
      if (prev && prev.product_name === product.product_name) return prev;

      speakDeal(`Best deal found for ${product.product_name} is ${product.lowest_price} on ${product.best_store}`);
      setScanHistory(h => {
        const exists = h.some(item => item.product_name === product.product_name);
        if (exists) return h;
        return [product, ...h].slice(0, 10);
      });

      setNotification({ product: product.product_name, price: product.lowest_price, store: product.best_store });
      setTimeout(() => setNotification(null), 4000);

      return product;
    });
  }, [speakDeal]);

  const handleSaveDeal = (product) => {
    setSavedDeals(prev => {
      const exists = prev.some(item => item.product_name === product.product_name);
      if (exists) return prev;
      return [product, ...prev];
    });
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    setActiveProduct(null);
  };

  const isDark = theme === "dark";

  return (
    <div
      className="app-bg"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* ── Top Telemetry Banner ─────────────────────────────────────── */}
      <div className="system-telemetry-bar">
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--success)",
                display: "inline-block",
                animation: "pulse-dot 1.5s infinite"
              }}
            />
            AI SCAN ENGINE: <strong style={{ color: "var(--text-h)" }}>ONLINE</strong>
          </span>
          <span>
            💰 MONETIZER: <strong style={{ color: "var(--accent)" }}>{affiliateTag}</strong>
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "var(--text)" }}>VOICE: {voiceEnabled ? "ON" : "MUTED"}</span>
          <span className="glow-green">● LIVE DISCLOSURE</span>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", width: "100%",
          padding: "20px 20px 40px", display: "flex",
          flexDirection: "column", gap: 24, flexGrow: 1,
          boxSizing: "border-box"
        }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <header
          style={{
            display: "flex", flexWrap: "wrap",
            justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid var(--border)", paddingBottom: 20, gap: 16
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #06b6d4 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, boxShadow: "0 4px 24px rgba(124,58,237,0.45)",
                flexShrink: 0
              }}
            >
              ⚡
            </div>
            <div>
              <h1
                style={{
                  margin: 0, fontSize: "1.5rem", fontWeight: 900,
                  background: "linear-gradient(135deg, var(--grad-from), var(--grad-via), var(--grad-to))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.5px",
                  display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "var(--sans)"
                }}
              >
                Affili-Detect
                <span
                  style={{
                    fontSize: "0.65rem", padding: "2px 8px",
                    background: "linear-gradient(135deg, var(--grad-from), var(--grad-via))",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6, fontFamily: "var(--mono)",
                    fontWeight: 700, letterSpacing: "0.1em"
                  }}
                >
                  v2.0
                </span>
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "var(--text)" }}>
                Real-time product vision lock-on &amp; multi-platform price comparison.
              </p>
            </div>
          </div>

          {/* Nav + Theme */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <nav
              style={{
                display: "flex", padding: 5,
                background: "var(--social-bg)",
                border: "1px solid var(--border)",
                borderRadius: 16, gap: 4
              }}
            >
              {[
                { id: "webcam", label: "📹 Scanner" },
                { id: "chatbot", label: "💬 Chatbot" },
                { id: "studio", label: "⚙️ Studio" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    fontFamily: "var(--mono)",
                    letterSpacing: "0.05em",
                    borderRadius: 11,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: activeTab === tab.id
                      ? "linear-gradient(135deg, var(--grad-from), var(--grad-via))"
                      : "transparent",
                    color: activeTab === tab.id ? "#fff" : "var(--text)",
                    boxShadow: activeTab === tab.id ? "0 2px 12px rgba(124,58,237,0.35)" : "none"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                width: 42, height: 42,
                borderRadius: "50%",
                background: "var(--social-bg)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "rotate(20deg) scale(1.12)";
                e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* ── Content ───────────────────────────────────────────────── */}
        <main style={{ flexGrow: 1 }}>
          {activeTab === "webcam" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)",
                gap: 24,
                alignItems: "start"
              }}
              className="dashboard-grid"
            >
              {/* Left: Webcam + Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <WebcamScanner
                  yoloEnabled={yoloEnabled}
                  confidenceThreshold={confidenceThreshold}
                  barcodeEnabled={barcodeEnabled}
                  ocrEnabled={ocrEnabled}
                  onProductMatched={handleProductMatched}
                  activeProduct={activeProduct}
                  affiliateTag={affiliateTag}
                />

                <ScannerControls
                  yoloEnabled={yoloEnabled}
                  onToggleYolo={setYoloEnabled}
                  voiceEnabled={voiceEnabled}
                  onToggleVoice={setVoiceEnabled}
                  barcodeEnabled={barcodeEnabled}
                  onToggleBarcode={setBarcodeEnabled}
                  ocrEnabled={ocrEnabled}
                  onToggleOcr={setOcrEnabled}
                  confidenceThreshold={confidenceThreshold}
                  onChangeConfidence={setConfidenceThreshold}
                  onClearHistory={handleClearHistory}
                  historyCount={scanHistory.length}
                />

                {/* Scan History */}
                {scanHistory.length > 0 && (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      background: "var(--social-bg)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px",
                        fontSize: "0.72rem",
                        fontFamily: "var(--mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--text)"
                      }}
                    >
                      Locked Target Log
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {scanHistory.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleProductMatched(item)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "1px solid",
                            fontSize: "0.78rem",
                            fontFamily: "var(--mono)",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                            background: activeProduct && activeProduct.product_name === item.product_name
                              ? "var(--accent-bg)" : "transparent",
                            borderColor: activeProduct && activeProduct.product_name === item.product_name
                              ? "var(--accent)" : "var(--border)",
                            color: activeProduct && activeProduct.product_name === item.product_name
                              ? "var(--accent)" : "var(--text)"
                          }}
                        >
                          🏷️ {item.product_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Price Dashboard */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <PriceDashboard
                  product={activeProduct}
                  onSaveDeal={handleSaveDeal}
                  onVoiceFeedback={speakDeal}
                  affiliateTag={affiliateTag}
                />

                {/* Saved Deals */}
                {savedDeals.length > 0 && (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      background: "var(--social-bg)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div
                      style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 14
                      }}
                    >
                      <h3
                        style={{
                          margin: 0, fontSize: "0.75rem",
                          fontFamily: "var(--mono)", textTransform: "uppercase",
                          letterSpacing: "0.08em", color: "var(--text-h)"
                        }}
                      >
                        Saved Deals Inventory
                      </h3>
                      <span
                        style={{
                          fontSize: "0.7rem", background: "var(--accent-bg)",
                          color: "var(--accent)", border: "1px solid var(--accent-border)",
                          padding: "2px 8px", borderRadius: 20, fontWeight: 700
                        }}
                      >
                        {savedDeals.length}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {savedDeals.map((deal, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 12
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-h)" }}>
                              {deal.product_name}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text)", marginTop: 2 }}>
                              Best on {deal.best_store}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--success)" }}>
                              {deal.lowest_price}
                            </span>
                            <button
                              onClick={() => setSavedDeals(prev => prev.filter(d => d.product_name !== deal.product_name))}
                              style={{
                                fontSize: "0.72rem", fontWeight: 700,
                                color: "#ef4444",
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                padding: "4px 10px", borderRadius: 8,
                                cursor: "pointer", transition: "all 0.18s ease"
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = "#ef4444";
                                e.currentTarget.style.color = "#fff";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                                e.currentTarget.style.color = "#ef4444";
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "chatbot" && (
            <RagChatbot
              scannedProduct={activeProduct ? activeProduct.product_name : null}
              onSelectProduct={(name) => setModalProductClass(name)}
              onSaveDeal={handleSaveDeal}
              affiliateTag={affiliateTag}
            />
          )}

          {activeTab === "studio" && (
            <CreatorStudio
              affiliateTag={affiliateTag}
              onSaveAffiliateTag={setAffiliateTag}
            />
          )}
        </main>
      </div>

      {/* One-time Detection Toast Notification */}
      {notification && (
        <div className="detect-toast animate-slide-in">
          <span className="detect-toast-icon">🎯</span>
          <div className="detect-toast-body">
            <strong>{notification.product}</strong> detected!
            <span className="detect-toast-detail">Best price: {notification.price} on {notification.store}</span>
          </div>
          <button className="detect-toast-dismiss" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Price Comparison Modal */}
      {modalProductClass && (
        <PriceComparisonModal
          productClass={modalProductClass}
          affiliateTag={affiliateTag}
          onClose={() => setModalProductClass(null)}
        />
      )}

      {/* Floating Chat Trigger */}
      <button
        className="floating-chatbot-trigger"
        onClick={() => setActiveTab("chatbot")}
        title="Open AI Shopping Chatbot"
      >
        💬
        {activeProduct && (
          <span className="chat-badge">1</span>
        )}
      </button>
    </div>
  );
}
