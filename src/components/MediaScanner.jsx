import { useState, useRef, useEffect } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

const SAMPLE_MEDIA = [
  {
    id: "sample1",
    name: "Minimalist Desk Setup",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
    presetObjects: [
      { class: "laptop", confidence: 96, price: "$899.00" },
      { class: "cup", confidence: 92, price: "$35.00" },
      { class: "keyboard", confidence: 89, price: "$109.99" },
      { class: "mouse", confidence: 87, price: "$99.99" }
    ]
  },
  {
    id: "sample2",
    name: "Modern Living Room & Office",
    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80",
    presetObjects: [
      { class: "chair", confidence: 94, price: "$149.99" },
      { class: "book", confidence: 91, price: "$14.99" },
      { class: "bottle", confidence: 85, price: "$29.99" }
    ]
  },
  {
    id: "sample3",
    name: "Coffee & Everyday Carry",
    url: "https://images.unsplash.com/photo-1512499617640-c74ae3a49dd5?w=800&auto=format&fit=crop&q=80",
    presetObjects: [
      { class: "cell phone", confidence: 98, price: "$149.95" },
      { class: "cup", confidence: 95, price: "$35.00" },
      { class: "book", confidence: 88, price: "$14.99" }
    ]
  }
];

export default function MediaScanner({ onSelectProduct }) {
  const [selectedImage, setSelectedImage] = useState(SAMPLE_MEDIA[0].url);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState(SAMPLE_MEDIA[0].presetObjects);
  const [model, setModel] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
      } catch (err) {
        console.error("Failed to load model in MediaScanner:", err);
      }
    };
    loadModel();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setDetectedItems([]);
    }
  };

  const scanImage = async () => {
    if (!imageRef.current) return;
    setIsScanning(true);

    try {
      if (model) {
        const predictions = await model.detect(imageRef.current);
        const processed = predictions.map((p) => ({
          class: p.class,
          confidence: Math.round(p.score * 100),
          price: "$29.99"
        }));
        setDetectedItems(processed);
      } else {
        // Fallback demo preset if model loading offline
        setDetectedItems([
          { class: "laptop", confidence: 95, price: "$899.00" },
          { class: "cell phone", confidence: 91, price: "$149.95" },
          { class: "cup", confidence: 88, price: "$35.00" }
        ]);
      }
    } catch (err) {
      console.error("Image scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSampleClick = (sample) => {
    setSelectedImage(sample.url);
    setDetectedItems(sample.presetObjects);
  };

  return (
    <div className="media-scanner-container dashboard-grid">
      {/* Upload & Media Viewer */}
      <div className="card cyberpunk-border">
        <div className="card-header">
          <h2>🖼️ Upload Photo or Video Lookbook</h2>
        </div>

        <div className="media-upload-area">
          <div className="media-preview-box">
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Scan Target"
              className="scan-target-img"
              onLoad={scanImage}
              crossOrigin="anonymous"
            />
            {isScanning && (
              <div className="scanning-overlay">
                <div className="scan-line"></div>
                <p>AI Extracting Products...</p>
              </div>
            )}
          </div>

          <div className="upload-controls">
            <label className="btn btn-primary file-input-label">
              📁 Choose Local Image / Video
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} hidden />
            </label>
            <button onClick={scanImage} className="btn btn-success" disabled={isScanning}>
              {isScanning ? "Scanning..." : "⚡ Run Neural Scan"}
            </button>
          </div>

          {/* Sample Presets */}
          <div className="sample-presets">
            <p className="section-label">Or Click a Sample Lookbook to Test:</p>
            <div className="presets-row">
              {SAMPLE_MEDIA.map((sample) => (
                <button
                  key={sample.id}
                  className={`preset-btn ${selectedImage === sample.url ? "active" : ""}`}
                  onClick={() => handleSampleClick(sample)}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shoppable Lookbook Results */}
      <div className="card cyberpunk-border">
        <div className="card-header">
          <h2>🛍️ Shoppable Lookbook Output</h2>
        </div>

        <div className="deals-content">
          {detectedItems.length === 0 ? (
            <div className="empty-deals">
              <h3>Scanning Media File...</h3>
              <p>Uploaded media items will be extracted into shoppable cards below.</p>
            </div>
          ) : (
            <div className="lookbook-results">
              <p className="section-label">Extracted Products ({detectedItems.length}):</p>
              <div className="product-cards-list">
                {detectedItems.map((item, index) => (
                  <div key={index} className="product-card" onClick={() => onSelectProduct(item.class)}>
                    <div className="product-visual">
                      <span className="product-emoji">
                        {item.class === "cell phone" ? "📱" : item.class === "laptop" ? "💻" : item.class === "cup" ? "☕" : "📦"}
                      </span>
                    </div>
                    <div className="product-details">
                      <h3 className="product-title">{item.class.toUpperCase()}</h3>
                      <div className="product-rating">
                        <span className="rating-val">Confidence: {item.confidence}%</span>
                      </div>
                      <div className="product-footer">
                        <span className="product-price">{item.price}</span>
                        <button className="btn btn-buy">
                          Shop Deals <span className="arrow-icon">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
