import { useState, useEffect } from "react";
import WebcamScanner from "./components/WebcamScanner";
import PriceComparisonModal from "./components/PriceComparisonModal";
import ShoppingCopilot from "./components/ShoppingCopilot";
import "./App.css";

// Comprehensive Affiliate Products Dictionary
const AFFILIATE_DEALS = {
  person: [
    {
      id: "p1",
      title: "Ergonomic Mesh Office Chair with Lumbar Support",
      price: "$149.99",
      rating: "4.6",
      reviews: "15,420",
      image: "🪑"
    },
    {
      id: "p2",
      title: "Garmin Venu 3 Smartwatch (GPS, Fitness Tracking)",
      price: "$449.99",
      rating: "4.7",
      reviews: "3,110",
      image: "⌚"
    }
  ],
  cup: [
    {
      id: "c1",
      title: "Yeti Rambler 20 oz Tumbler, Stainless Steel",
      price: "$35.00",
      rating: "4.8",
      reviews: "82,490",
      image: "🥤"
    },
    {
      id: "c2",
      title: "Ember Temperature Control Smart Mug 2",
      price: "$129.95",
      rating: "4.5",
      reviews: "7,820",
      image: "☕"
    }
  ],
  bottle: [
    {
      id: "b1",
      title: "Hydro Flask Wide Mouth Water Bottle with Flex Straw",
      price: "$39.95",
      rating: "4.8",
      reviews: "45,210",
      image: "🧪"
    },
    {
      id: "b2",
      title: "Brita Insulated Filtered Water Bottle (Stainless Steel)",
      price: "$29.99",
      rating: "4.6",
      reviews: "22,180",
      image: "🚰"
    }
  ],
  "cell phone": [
    {
      id: "cp1",
      title: "Anker 3-in-1 Charging Cube with MagSafe",
      price: "$149.95",
      rating: "4.7",
      reviews: "1,240",
      image: "🔌"
    },
    {
      id: "cp2",
      title: "Lamicall Adjustable Cell Phone Stand for Desk",
      price: "$11.99",
      rating: "4.7",
      reviews: "95,430",
      image: "📱"
    }
  ],
  laptop: [
    {
      id: "l1",
      title: "Lamicall Ergonomic Laptop Stand (Multi-Angle)",
      price: "$24.99",
      rating: "4.7",
      reviews: "34,810",
      image: "💻"
    },
    {
      id: "l2",
      title: "Anker USB-C Hub, 8-in-1 Adapter with Dual HDMI",
      price: "$49.99",
      rating: "4.6",
      reviews: "18,920",
      image: "🔌"
    }
  ],
  keyboard: [
    {
      id: "kb1",
      title: "Logitech MX Keys S Wireless Mechanical Keyboard",
      price: "$109.99",
      rating: "4.7",
      reviews: "5,340",
      image: "⌨️"
    }
  ],
  mouse: [
    {
      id: "m1",
      title: "Logitech MX Master 3S Wireless Ergonomic Mouse",
      price: "$99.99",
      rating: "4.7",
      reviews: "14,890",
      image: "🖱️"
    }
  ],
  book: [
    {
      id: "bk1",
      title: "Atomic Habits by James Clear (Hardcover)",
      price: "$14.99",
      rating: "4.8",
      reviews: "185,420",
      image: "📚"
    }
  ],
  backpack: [
    {
      id: "bp1",
      title: "Travel Laptop Backpack with USB Charging Port",
      price: "$29.99",
      rating: "4.7",
      reviews: "114,350",
      image: "🎒"
    }
  ],
  chair: [
    {
      id: "ch1",
      title: "Ergonomic Lumbar Support Pillow for Office Chair",
      price: "$25.99",
      rating: "4.5",
      reviews: "29,480",
      image: "🪑"
    }
  ],
  scissors: [
    { id: "sc1", title: "Fiskars 8-inch All-Purpose Scissors", price: "$8.49", rating: "4.8", reviews: "62,310", image: "✂️" }
  ],
  remote: [
    { id: "rm1", title: "Universal Smart TV Remote Control", price: "$12.99", rating: "4.4", reviews: "9,840", image: "🎛️" }
  ],
  toothbrush: [
    { id: "tb1", title: "Oral-B Pro Rechargeable Electric Toothbrush", price: "$44.99", rating: "4.6", reviews: "31,205", image: "🪥" }
  ],
  "potted plant": [
    { id: "pp1", title: "Indoor Snake Plant in Decorative Pot", price: "$24.99", rating: "4.5", reviews: "7,850", image: "🪴" }
  ],
  "sports ball": [
    { id: "sb1", title: "Wilson Official Size Basketball", price: "$29.95", rating: "4.7", reviews: "18,730", image: "🏀" }
  ],
  handbag: [
    { id: "hb1", title: "Everyday Crossbody Handbag", price: "$39.99", rating: "4.5", reviews: "11,620", image: "👜" }
  ],
  "teddy bear": [
    { id: "td1", title: "Soft Plush Teddy Bear, 12-inch", price: "$16.99", rating: "4.8", reviews: "24,570", image: "🧸" }
  ],
  clock: [
    { id: "cl1", title: "Digital Alarm Clock with USB Charging", price: "$18.99", rating: "4.4", reviews: "14,390", image: "⏰" }
  ],
  vase: [
    { id: "vs1", title: "Modern Ceramic Flower Vase", price: "$21.99", rating: "4.6", reviews: "6,945", image: "🏺" }
  ]
};

const getFallbackDeals = (className) => {
  const cleanName = className ? className.charAt(0).toUpperCase() + className.slice(1) : "Product";
  return [
    {
      id: `fallback-${className}-1`,
      title: `Best Selling ${cleanName} on Amazon`,
      price: "Check Best Price",
      rating: "4.6",
      reviews: "12,450",
      image: "🔍"
    },
    {
      id: `fallback-${className}-2`,
      title: `Top Rated ${cleanName} Deals`,
      price: "Best Savings",
      rating: "4.7",
      reviews: "8,920",
      image: "🛍️"
    }
  ];
};

function App() {
  const [activeTab, setActiveTab] = useState("webcam"); // 'webcam', 'copilot'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("affili-detect-theme");
    return savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  const [affiliateTag, setAffiliateTag] = useState("affilidetect-20");
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("cell phone");
  const [modalProductClass, setModalProductClass] = useState(null);

  // Read URL query parameter ?tag=... if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    if (tag) setAffiliateTag(tag);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("affili-detect-theme", theme);
  }, [theme]);

  const handleDetectObjects = (objects) => {
    setDetectedObjects(objects);
    if (objects.length > 0) {
      const classes = objects.map((o) => o.class);
      if (!classes.includes(selectedClass)) {
        setSelectedClass(classes[0]);
      }
    }
  };

  const getMatchedDeals = () => {
    if (!selectedClass) return [];
    return AFFILIATE_DEALS[selectedClass] || getFallbackDeals(selectedClass);
  };

  // Group duplicate camera detections and retain the strongest confidence for
  // each object type, making the live inventory easy to scan.
  const liveDetections = Object.values(
    detectedObjects.reduce((groups, object) => {
      const current = groups[object.class];
      if (!current || object.confidence > current.confidence) {
        groups[object.class] = { ...object, count: (current?.count || 0) + 1 };
      } else {
        current.count += 1;
      }
      return groups;
    }, {})
  ).sort((a, b) => b.confidence - a.confidence);

  const openComparisonModal = (className) => {
    setModalProductClass(className || selectedClass);
  };

  return (
    <div className="app-container">
      {/* Top Banner Telemetry */}
      <div className="system-telemetry-bar">
        <span className="telemetry-item">⚡ AI VISION ENGINE: <strong>ONLINE</strong></span>
        <span className="telemetry-item">💰 ACTIVE TAG: <strong>{affiliateTag}</strong></span>
        <span className="telemetry-item glow-green">● MONETIZATION LIVE</span>
      </div>

      <header className="app-header">
        <div className="logo-section">
          <span className="logo-emoji">⚡</span>
          <h1>Affili-Detect</h1>
        </div>
        <p className="app-subtitle">
          Award-Winning AI Visual Search & Real-Time Affiliate Shopping Engine
        </p>

        {/* Multi-Tab Navigation */}
        <nav className="tab-navigation">
          <button
            className={`nav-tab-btn ${activeTab === "webcam" ? "active" : ""}`}
            onClick={() => setActiveTab("webcam")}
          >
            📹 Live AR Webcam
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "copilot" ? "active" : ""}`}
            onClick={() => setActiveTab("copilot")}
          >
            AI Shopping Copilot
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? "☀️ Colorful mode" : "🌙 Dark mode"}
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="tab-content-area">
        {activeTab === "webcam" && (
          <div className="dashboard-grid">
            {/* Left: AR Target Scanner */}
            <WebcamScanner
              onDetectObjects={handleDetectObjects}
              onSelectProduct={openComparisonModal}
              selectedClass={selectedClass}
            />

            {/* Right: Real-time Affiliate Product Matcher */}
            <div className="deals-card card cyberpunk-border">
              <div className="card-header">
                <h2>Matched Affiliate Deals</h2>
                <span className="live-pulse-badge">LIVE ENGINE</span>
              </div>

              <div className="deals-content">
                {detectedObjects.length === 0 ? (
                  <div className="empty-deals">
                    <div className="search-radar">
                      <div className="radar-circle"></div>
                      <div className="radar-circle"></div>
                      <div className="radar-circle"></div>
                    </div>
                    <h3>Scanning Live Feed...</h3>
                    <p>Hold an item in front of your camera or click a demo tag below:</p>

                    <div className="tips-list">
                      <p className="tips-title">💡 Instant Demo Objects:</p>
                      <div className="tips-tags">
                        <span onClick={() => { setSelectedClass("cell phone"); setDetectedObjects([{ class: "cell phone", confidence: 95 }]); }} className="tag">📱 Cell Phone</span>
                        <span onClick={() => { setSelectedClass("cup"); setDetectedObjects([{ class: "cup", confidence: 92 }]); }} className="tag">☕ Cup / Mug</span>
                        <span onClick={() => { setSelectedClass("laptop"); setDetectedObjects([{ class: "laptop", confidence: 89 }]); }} className="tag">💻 Laptop</span>
                        <span onClick={() => { setSelectedClass("book"); setDetectedObjects([{ class: "book", confidence: 94 }]); }} className="tag">📚 Book</span>
                        <span onClick={() => { setSelectedClass("bottle"); setDetectedObjects([{ class: "bottle", confidence: 88 }]); }} className="tag">🧪 Bottle</span>
                        <span onClick={() => { setSelectedClass("scissors"); setDetectedObjects([{ class: "scissors", confidence: 91 }]); }} className="tag">✂️ Scissors</span>
                        <span onClick={() => { setSelectedClass("remote"); setDetectedObjects([{ class: "remote", confidence: 90 }]); }} className="tag">🎛️ Remote</span>
                        <span onClick={() => { setSelectedClass("toothbrush"); setDetectedObjects([{ class: "toothbrush", confidence: 89 }]); }} className="tag">🪥 Toothbrush</span>
                        <span onClick={() => { setSelectedClass("potted plant"); setDetectedObjects([{ class: "potted plant", confidence: 87 }]); }} className="tag">🪴 Plant</span>
                        <span onClick={() => { setSelectedClass("sports ball"); setDetectedObjects([{ class: "sports ball", confidence: 92 }]); }} className="tag">🏀 Ball</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="detected-deals-container">
                    <div className="detected-tabs">
                      <div className="inventory-heading">
                        <div>
                          <p className="section-label">Live Detection Inventory</p>
                          <p className="inventory-caption">Items currently visible in your webcam</p>
                        </div>
                        <span className="inventory-count">{liveDetections.length} types</span>
                      </div>
                      <div className="detection-inventory">
                        {liveDetections.map((obj) => (
                          <button
                            key={obj.class}
                            className={`detection-item ${selectedClass === obj.class ? "active" : ""}`}
                            onClick={() => setSelectedClass(obj.class)}
                          >
                            <span className="detection-item-top">
                              <span className="detection-name">{obj.class}</span>
                              <span className="detection-accuracy">{obj.confidence}% accurate</span>
                            </span>
                            <span className="accuracy-meter" aria-label={`${obj.confidence}% detection confidence`}>
                              <span style={{ width: `${obj.confidence}%` }}></span>
                            </span>
                            <span className="detection-meta">
                              {obj.count > 1 ? `${obj.count} items visible` : "1 item visible"}
                              <span>{obj.confidence >= 85 ? "High confidence" : "Confirmed match"}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Product Cards List */}
                    <div className="deals-results">
                      <p className="section-label">Best Matches for "{selectedClass}":</p>
                      <div className="product-cards-list">
                        {getMatchedDeals().map((deal) => (
                          <div key={deal.id} className="product-card">
                            <div className="product-visual">
                              <span className="product-emoji">{deal.image}</span>
                            </div>
                            <div className="product-details">
                              <h3 className="product-title">{deal.title}</h3>
                              <div className="product-rating">
                                <span className="star-icon">★</span>
                                <span className="rating-val">{deal.rating}</span>
                                <span className="reviews-count">({deal.reviews} reviews)</span>
                              </div>
                              <div className="product-footer">
                                <span className="product-price">{deal.price}</span>
                                <button
                                  onClick={() => openComparisonModal(selectedClass)}
                                  className="btn btn-buy"
                                >
                                  Compare Stores & Buy →
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "copilot" && <ShoppingCopilot />}
      </main>

      {/* Multi-Store Comparison Modal Popup */}
      {modalProductClass && (
        <PriceComparisonModal
          productClass={modalProductClass}
          affiliateTag={affiliateTag}
          onClose={() => setModalProductClass(null)}
        />
      )}
    </div>
  );
}

export default App;
