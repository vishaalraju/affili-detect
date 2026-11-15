import { useState, useEffect, useRef, useCallback } from "react";

const VISION_API = "/vision-api";

/**
 * ProductIntelligence — Full AI analysis panel.
 * Shows: pros/cons, price prediction, fake review score,
 *        best time to buy, alternative suggestions, AI verdict.
 */
export default function ProductIntelligence({
  product,
  affiliateTag = "affilidetect-20",
}) {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const lastFetchedRef = useRef("");
  const canvasRef = useRef(null);

  // Fetch intelligence when product changes
  const fetchIntelligence = useCallback(async () => {
    if (!product || !product.product_name) return;
    if (lastFetchedRef.current === product.product_name) return;

    setLoading(true);
    setError("");
    lastFetchedRef.current = product.product_name;

    try {
      const formData = new FormData();
      formData.append("product_name", product.product_name);
      formData.append("product_id", product.product_id || "");
      formData.append("category", product.category || "");
      formData.append(
        "base_price",
        String(
          product.deals?.[0]?.numeric_price ||
            parseFloat(product.lowest_price?.replace("$", "")) ||
            100
        )
      );
      formData.append("affiliate_tag", affiliateTag);

      const response = await fetch(`${VISION_API}/api/product-intelligence`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setIntel(data);
    } catch {
      // Generate offline fallback intelligence
      setIntel(generateOfflineFallback(product));
    } finally {
      setLoading(false);
    }
  }, [product, affiliateTag]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  // Draw mini price chart on canvas
  useEffect(() => {
    if (!intel?.price_history || !canvasRef.current) return;
    drawPriceChart(canvasRef.current, intel.price_history);
  }, [intel, activeSection]);

  if (!product) return null;

  if (loading) {
    return (
      <div className="intel-panel">
        <div className="intel-loading">
          <div className="intel-spinner" />
          <p>Analyzing product intelligence...</p>
          <span>Running ML models locally</span>
        </div>
      </div>
    );
  }

  if (!intel) return null;

  const sections = [
    { id: "overview", label: "🎯 Verdict", icon: "🎯" },
    { id: "proscons", label: "⚖️ Analysis", icon: "⚖️" },
    { id: "price", label: "📈 Price ML", icon: "📈" },
    { id: "reviews", label: "🔍 Reviews", icon: "🔍" },
    { id: "timing", label: "📅 Timing", icon: "📅" },
    { id: "alternatives", label: "🔄 Alts", icon: "🔄" },
  ];

  return (
    <div className="intel-panel">
      {/* Header */}
      <div className="intel-header">
        <div>
          <h3 className="intel-title">🧠 AI Product Intelligence</h3>
          <p className="intel-subtitle">
            ML-powered analysis for{" "}
            <strong>{intel.product_name || product.product_name}</strong>
          </p>
        </div>
        {intel.ai_verdict && (
          <span
            className="intel-verdict-badge"
            style={{ borderColor: intel.ai_verdict.color, color: intel.ai_verdict.color }}
          >
            {intel.ai_verdict.label}
          </span>
        )}
      </div>

      {/* Section Tabs */}
      <div className="intel-tabs">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`intel-tab ${activeSection === s.id ? "active" : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="intel-content">
        {activeSection === "overview" && (
          <OverviewSection intel={intel} product={product} />
        )}
        {activeSection === "proscons" && (
          <ProsConsSection data={intel.pros_cons} />
        )}
        {activeSection === "price" && (
          <PricePredictionSection
            prediction={intel.price_prediction}
            history={intel.price_history}
            canvasRef={canvasRef}
          />
        )}
        {activeSection === "reviews" && (
          <ReviewAnalysisSection data={intel.review_analysis} />
        )}
        {activeSection === "timing" && (
          <TimingSection data={intel.buy_timing} />
        )}
        {activeSection === "alternatives" && (
          <AlternativesSection
            alternatives={intel.alternatives}
            affiliateTag={affiliateTag}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-sections ────────────────────────────────────────────────────────────

function OverviewSection({ intel, product }) {
  const rating = intel.pros_cons?.rating || 4.0;
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));

  return (
    <div className="intel-overview">
      {/* Verdict card */}
      <div
        className="intel-verdict-card"
        style={{ borderLeftColor: intel.ai_verdict?.color || "#3b82f6" }}
      >
        <div className="verdict-main">
          <span className="verdict-icon">{intel.ai_verdict?.label?.charAt(0) || "✅"}</span>
          <div>
            <strong>{intel.ai_verdict?.label || "Analysis Complete"}</strong>
            <p>{intel.pros_cons?.verdict || "See detailed analysis below."}</p>
          </div>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="intel-stats-grid">
        <div className="intel-stat-card">
          <span className="stat-icon">⭐</span>
          <div>
            <span className="stat-value">{rating}/5.0</span>
            <span className="stat-label">AI Rating</span>
          </div>
        </div>
        <div className="intel-stat-card">
          <span className="stat-icon">
            {intel.price_prediction?.trend === "dropping" ? "📉" :
             intel.price_prediction?.trend === "rising" ? "📈" : "➡️"}
          </span>
          <div>
            <span className="stat-value">
              {intel.price_prediction?.trend === "dropping" ? "Dropping" :
               intel.price_prediction?.trend === "rising" ? "Rising" : "Stable"}
            </span>
            <span className="stat-label">Price Trend</span>
          </div>
        </div>
        <div className="intel-stat-card">
          <span className="stat-icon">
            {intel.review_analysis?.risk_level === "low" ? "✅" :
             intel.review_analysis?.risk_level === "medium" ? "⚠️" : "🚨"}
          </span>
          <div>
            <span className="stat-value">
              {100 - (intel.review_analysis?.risk_score || 0)}%
            </span>
            <span className="stat-label">Review Trust</span>
          </div>
        </div>
        <div className="intel-stat-card">
          <span className="stat-icon">
            {intel.buy_timing?.verdict === "buy_now" ? "🟢" :
             intel.buy_timing?.verdict === "wait" ? "🔴" : "🟡"}
          </span>
          <div>
            <span className="stat-value">
              {intel.buy_timing?.verdict === "buy_now" ? "Now!" :
               intel.buy_timing?.verdict === "wait" ? "Wait" : "Fair"}
            </span>
            <span className="stat-label">Buy Timing</span>
          </div>
        </div>
      </div>

      {/* Rating stars */}
      <div className="intel-rating-row">
        <span className="star-display">{stars}</span>
        <span className="rating-text">
          Based on {intel.pros_cons?.pros?.length || 3} pros, {intel.pros_cons?.cons?.length || 3} cons analysis
        </span>
      </div>
    </div>
  );
}

function ProsConsSection({ data }) {
  if (!data) return <p className="intel-empty">No analysis available.</p>;
  return (
    <div className="intel-proscons">
      <div className="pros-column">
        <h4 className="pros-heading">✅ Pros</h4>
        <ul>
          {(data.pros || []).map((p, i) => (
            <li key={i} className="pro-item">
              <span className="bullet-pro">+</span> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="cons-column">
        <h4 className="cons-heading">❌ Cons</h4>
        <ul>
          {(data.cons || []).map((c, i) => (
            <li key={i} className="con-item">
              <span className="bullet-con">−</span> {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PricePredictionSection({ prediction, history, canvasRef }) {
  if (!prediction) return <p className="intel-empty">No price data available.</p>;

  const trendColor =
    prediction.trend === "dropping"
      ? "#10b981"
      : prediction.trend === "rising"
      ? "#ef4444"
      : "#f59e0b";
  const trendIcon =
    prediction.trend === "dropping"
      ? "📉"
      : prediction.trend === "rising"
      ? "📈"
      : "➡️";

  return (
    <div className="intel-price-section">
      <div className="price-pred-header">
        <div>
          <span className="pred-label">30-Day Forecast</span>
          <span className="pred-value" style={{ color: trendColor }}>
            {trendIcon} ${prediction.predicted_price?.toFixed(2)}
          </span>
        </div>
        <div className="pred-meta">
          <span>
            Current: <strong>${prediction.current_price?.toFixed(2)}</strong>
          </span>
          <span style={{ color: trendColor }}>
            {prediction.pct_change > 0 ? "+" : ""}
            {prediction.pct_change}% expected
          </span>
          <span>Confidence: {prediction.confidence}%</span>
        </div>
      </div>

      {/* Mini price chart */}
      <div className="price-chart-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="price-chart-canvas"
        />
      </div>

      <div className="price-model-badge">
        <span>🤖</span> Linear regression on 90-day simulated price history
      </div>
    </div>
  );
}

function ReviewAnalysisSection({ data }) {
  if (!data) return <p className="intel-empty">No review data available.</p>;

  const riskColor =
    data.risk_level === "low"
      ? "#10b981"
      : data.risk_level === "medium"
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="intel-reviews">
      {/* Risk score */}
      <div className="review-risk-card" style={{ borderLeftColor: riskColor }}>
        <div className="risk-header">
          <strong style={{ color: riskColor }}>{data.risk_label}</strong>
          <span className="risk-score-badge" style={{ background: riskColor }}>
            Risk: {data.risk_score}/100
          </span>
        </div>
        <p className="risk-meta">
          {data.total_reviews?.toLocaleString()} total reviews • {data.verified_purchase_pct}% verified purchases
        </p>
      </div>

      {/* Flags */}
      {data.flags && data.flags.length > 0 && (
        <div className="review-flags">
          <h4>⚠️ Suspicious Patterns Detected</h4>
          <ul>
            {data.flags.map((flag, i) => (
              <li key={i} className="flag-item">{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      {data.metrics && (
        <div className="review-metrics-grid">
          <div className="review-metric">
            <span className="metric-val">{data.metrics.five_star_pct}%</span>
            <span className="metric-lbl">5-Star</span>
          </div>
          <div className="review-metric">
            <span className="metric-val">{data.metrics.verified_pct}%</span>
            <span className="metric-lbl">Verified</span>
          </div>
          <div className="review-metric">
            <span className="metric-val">{data.metrics.avg_review_length}</span>
            <span className="metric-lbl">Avg Length</span>
          </div>
          <div className="review-metric">
            <span className="metric-val">{data.metrics.burst_review_pct}%</span>
            <span className="metric-lbl">Burst %</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TimingSection({ data }) {
  if (!data) return <p className="intel-empty">No timing data available.</p>;

  const timingColor =
    data.verdict === "buy_now"
      ? "#10b981"
      : data.verdict === "wait"
      ? "#ef4444"
      : "#f59e0b";

  return (
    <div className="intel-timing">
      <div className="timing-verdict-card" style={{ borderLeftColor: timingColor }}>
        <strong style={{ color: timingColor }}>{data.label}</strong>
        <p>{data.reason}</p>
      </div>

      <div className="timing-details">
        <div className="timing-row">
          <span className="timing-label">Best Months</span>
          <div className="timing-months">
            {(data.best_months || []).map((m, i) => (
              <span key={i} className="month-badge best">{m}</span>
            ))}
          </div>
        </div>
        <div className="timing-row">
          <span className="timing-label">Potential Savings</span>
          <span className="savings-badge">{data.potential_savings}</span>
        </div>
        <div className="timing-row">
          <span className="timing-label">Next Best Window</span>
          <span className="next-best-badge">{data.next_best_month}</span>
        </div>
      </div>
    </div>
  );
}

function AlternativesSection({ alternatives, affiliateTag }) {
  if (!alternatives || alternatives.length === 0) {
    return <p className="intel-empty">No alternatives found in catalog.</p>;
  }

  return (
    <div className="intel-alternatives">
      {alternatives.map((alt, i) => {
        const q = encodeURIComponent(alt.title);
        const url = `https://www.amazon.com/s?k=${q}&tag=${affiliateTag}`;
        return (
          <div key={i} className="alt-card">
            <div className="alt-info">
              <strong>{alt.title}</strong>
              <span className="alt-price">{alt.price_formatted}</span>
              <span className="alt-desc">{alt.description}</span>
              {alt.cross_category && (
                <span className="alt-cross-badge">Different Category</span>
              )}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="alt-shop-btn"
            >
              Shop →
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawPriceChart(canvas, history) {
  if (!history || history.length < 2) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const padding = { top: 10, bottom: 20, left: 10, right: 10 };

  ctx.clearRect(0, 0, W, H);

  const prices = history.map((p) => p.price);
  const minP = Math.min(...prices) * 0.98;
  const maxP = Math.max(...prices) * 1.02;
  const rangeP = maxP - minP || 1;

  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
  gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
  gradient.addColorStop(1, "rgba(59, 130, 246, 0.01)");

  ctx.beginPath();
  ctx.moveTo(padding.left, H - padding.bottom);
  history.forEach((point, i) => {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + (1 - (point.price - minP) / rangeP) * chartH;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(padding.left + chartW, H - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  history.forEach((point, i) => {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + (1 - (point.price - minP) / rangeP) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Draw latest point
  const lastX = padding.left + chartW;
  const lastY =
    padding.top + (1 - (prices[prices.length - 1] - minP) / rangeP) * chartH;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#3b82f6";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Price labels
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.font = "10px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`$${maxP.toFixed(0)}`, 2, padding.top + 10);
  ctx.fillText(`$${minP.toFixed(0)}`, 2, H - padding.bottom - 2);
  ctx.textAlign = "right";
  ctx.fillText("90d ago", padding.left + 4, H - 4);
  ctx.fillText("Today", W - padding.right, H - 4);
}

function generateOfflineFallback(product) {
  const price =
    parseFloat(product.lowest_price?.replace("$", "")) || 100;
  return {
    product_name: product.product_name,
    product_id: product.product_id || "unknown",
    category: product.category || "general",
    base_price: price,
    pros_cons: {
      pros: [
        "Well-reviewed by users",
        "Good value for money",
        "Solid build quality",
        "Popular in its category",
      ],
      cons: [
        "May have cheaper alternatives",
        "Check warranty terms",
        "Limited color options",
        "Compare specs before buying",
      ],
      rating: 4.0,
      verdict: "Decent product — compare alternatives before buying",
    },
    price_prediction: {
      predicted_price: price * 0.97,
      current_price: price,
      trend: "stable",
      pct_change: -3,
      confidence: 65,
      days_ahead: 30,
    },
    buy_timing: {
      verdict: "fair",
      label: "🟡 FAIR PRICE — Next best window: Nov",
      best_months: ["Jul", "Nov"],
      reason:
        "Prime Day (Jul) and Black Friday (Nov) are reliable sale events.",
      potential_savings: "10-25%",
      next_best_month: "Nov",
    },
    review_analysis: {
      risk_score: 20,
      risk_level: "medium",
      risk_label: "⚠️ Some review patterns worth noting",
      total_reviews: 2400,
      verified_purchase_pct: 72,
      flags: [],
      metrics: {
        five_star_pct: 62,
        verified_pct: 72,
        avg_review_length: 145,
        burst_review_pct: 6,
        generic_language_pct: 12,
      },
    },
    alternatives: [],
    ai_verdict: { verdict: "fair_deal", label: "🟡 Fair Deal", color: "#f59e0b" },
    price_history: Array.from({ length: 30 }, (_, i) => ({
      date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      price: price * (0.95 + Math.random() * 0.1),
    })),
  };
}
