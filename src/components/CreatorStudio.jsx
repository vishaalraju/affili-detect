import { useState } from "react";

export default function CreatorStudio({ affiliateTag, onSaveAffiliateTag }) {
  const [tagInput, setTagInput] = useState(affiliateTag || "affilidetect-20");
  const [monthlyTraffic, setMonthlyTraffic] = useState(25000);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Commission Simulator Calculation
  const avgOrderValue = 45; // $45 avg cart size
  const conversionRate = 0.035; // 3.5% conversion rate
  const commissionRate = 0.06; // 6% avg affiliate payout
  const projectedOrders = Math.round(monthlyTraffic * conversionRate);
  const projectedRevenue = Math.round(projectedOrders * avgOrderValue * commissionRate);

  const handleSave = (e) => {
    e.preventDefault();
    onSaveAffiliateTag(tagInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/?tag=${encodeURIComponent(tagInput)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="creator-studio-container dashboard-grid">
      {/* Left Column: Affiliate Tag Configuration */}
      <div className="card cyberpunk-border">
        <div className="card-header">
          <h2>⚙️ Creator Monetization Studio</h2>
        </div>

        <div className="creator-body">
          <p className="studio-intro">
            Plug in your custom Amazon Associates & Network Affiliate IDs. Every purchase generated through your webcam streams or lookbook links pays 100% of the commission directly to your account!
          </p>

          <form onSubmit={handleSave} className="tag-form">
            <div className="form-group">
              <label>Amazon Associate Tracking ID / Tag:</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. mystore-20"
                className="input-text"
                required
              />
            </div>

            <div className="form-group">
              <label>Walmart Affiliate ID (Optional):</label>
              <input
                type="text"
                placeholder="e.g. wm-partner-992"
                className="input-text"
              />
            </div>

            <div className="form-group">
              <label>eBay Partner Network ID (Optional):</label>
              <input
                type="text"
                placeholder="e.g. epn-5338012"
                className="input-text"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-save">
              💾 Save Active Affiliate Tags
            </button>

            {savedSuccess && (
              <div className="success-banner">
                ✓ Active tag saved as <strong>"{tagInput}"</strong>! All product links now use your ID.
              </div>
            )}
          </form>

          {/* Shareable Link Generator */}
          <div className="share-link-box">
            <h3>🔗 Your Shoppable AI Scanner Link</h3>
            <p>Share this link on TikTok, YouTube bios, or Instagram to earn commissions:</p>
            <div className="copy-row">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?tag=${tagInput}`}
                className="share-input"
              />
              <button onClick={copyShareLink} className="btn btn-success">
                {copied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Earnings Projection Simulator */}
      <div className="card cyberpunk-border">
        <div className="card-header">
          <h2>📈 Revenue & Commission Simulator</h2>
        </div>

        <div className="deals-content">
          <div className="simulator-box">
            <div className="sim-slider-group">
              <label>
                Estimated Monthly Visitors / Stream Views:
                <span className="slider-val"> {monthlyTraffic.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={monthlyTraffic}
                onChange={(e) => setMonthlyTraffic(Number(e.target.value))}
                className="range-slider"
              />
            </div>

            <div className="earnings-summary-grid">
              <div className="earning-stat-card">
                <span className="stat-label">Estimated Monthly Orders</span>
                <span className="stat-value">{projectedOrders.toLocaleString()}</span>
              </div>
              <div className="earning-stat-card highlight">
                <span className="stat-label">Projected Monthly Revenue</span>
                <span className="stat-value font-emerald">${projectedRevenue.toLocaleString()} / mo</span>
              </div>
              <div className="earning-stat-card">
                <span className="stat-label">Projected Yearly Income</span>
                <span className="stat-value font-cyan">${(projectedRevenue * 12).toLocaleString()} / yr</span>
              </div>
            </div>

            <div className="simulator-tips">
              <p>💡 <strong>Monetization Tip:</strong> Live computer vision links convert 3.5x higher than text links because shoppers see the exact product in real-time camera feeds!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
