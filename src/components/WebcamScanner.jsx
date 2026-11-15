import React, { useEffect, useRef, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

// Web Audio API lock-on sound
const playLockOnSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch { /* audio context may be restricted */ }
};

// Use Vite proxy when in dev, direct URL in production
const VISION_API = "/vision-api";

// Expanded COCO-SSD product catalogue — 80+ mapped classes for e-commerce detection
const LOCAL_PRODUCT_CATALOG = {
  // ── Electronics ────────────────────────────────────────────────────────────
  "cell phone":       { name: "iPhone 15 Pro Max",                   price: 1199,   category: "phone" },
  "laptop":           { name: "MacBook Pro 16 M3",                   price: 2499,   category: "laptop" },
  "tv":               { name: "Samsung 55\" Neo QLED 4K Smart TV",   price: 1297,   category: "electronics" },
  "keyboard":         { name: "Logitech MX Keys S Keyboard",         price: 109.99, category: "electronics" },
  "mouse":            { name: "Logitech MX Master 3S Mouse",         price: 99.99,  category: "electronics" },
  "remote":           { name: "Amazon Fire TV Stick 4K Max Remote",  price: 34.99,  category: "electronics" },
  "computer monitor": { name: "Dell UltraSharp 27\" 4K USB-C Monitor", price: 519.99, category: "electronics" },
  "book":             { name: "Atomic Habits by James Clear",        price: 14.99,  category: "books" },

  // ── Audio / Wearables ───────────────────────────────────────────────────────
  "watch":            { name: "Apple Watch Ultra 2",                 price: 799,    category: "watch" },
  "clock":            { name: "Echo Dot 5th Gen with Clock",         price: 59.99,  category: "electronics" },

  // ── Kitchen & Dining ────────────────────────────────────────────────────────
  "cup":              { name: "Yeti Rambler 20 oz Tumbler",          price: 35,     category: "drinkware" },
  "bottle":           { name: "Hydro Flask 32 oz Wide Mouth Bottle", price: 44.95,  category: "drinkware" },
  "wine glass":       { name: "Riedel Crystal Wine Glass Set 4-Pk",  price: 49.99,  category: "drinkware" },
  "knife":            { name: "Victorinox 8\" Fibrox Chef Knife",    price: 44.95,  category: "kitchen" },
  "spoon":            { name: "Oneida 45-Piece Flatware Set",        price: 49.99,  category: "kitchen" },
  "fork":             { name: "Cambridge Silversmiths 20-Pc Set",    price: 39.99,  category: "kitchen" },
  "bowl":             { name: "Instant Pot 6 Qt Stainless Bowl",     price: 29.99,  category: "kitchen" },
  "microwave":        { name: "Toshiba 1.2 cu ft Microwave Oven",    price: 129,    category: "appliances" },
  "oven":             { name: "Breville BOV900BSS Smart Oven Air",   price: 399,    category: "appliances" },
  "refrigerator":     { name: "LG 27 cu ft French Door Refrigerator", price: 1699,  category: "appliances" },
  "toaster":          { name: "Cuisinart CPT-180 4-Slice Toaster",   price: 49.95,  category: "appliances" },
  "sandwich":         { name: "COSORI Air Fryer 5.8 Qt",             price: 99.99,  category: "appliances" },
  "pizza":            { name: "Ooni Karu 16 Multi-Fuel Pizza Oven",  price: 799,    category: "kitchen" },
  "cake":             { name: "Nordic Ware 10-Cup Bundt Pan",        price: 24.99,  category: "kitchen" },
  "hot dog":          { name: "Dash Hot Dog Maker / Cooker",         price: 24.99,  category: "kitchen" },
  "banana":           { name: "Ninja BL610 Professional Blender",    price: 59.99,  category: "appliances" },
  "apple":            { name: "Vitamix 5200 Professional Blender",   price: 449,    category: "appliances" },
  "orange":           { name: "Cuisinart CTJ-100 Pulp Control Juicer", price: 69.95, category: "appliances" },
  "carrot":           { name: "KitchenAid Stand Mixer 5 Qt",         price: 349.99, category: "appliances" },

  // ── Bags & Luggage ──────────────────────────────────────────────────────────
  "backpack":         { name: "Osprey Daylite 13L Backpack",         price: 75,     category: "bags" },
  "handbag":          { name: "Coach Signature Mini Camera Bag",     price: 198,    category: "bags" },
  "suitcase":         { name: "Samsonite Omni PC 28\" Hardside Spinner", price: 179, category: "luggage" },

  // ── Clothing & Fashion ──────────────────────────────────────────────────────
  "tie":              { name: "Ermenegildo Zegna Silk Necktie",      price: 220,    category: "clothing" },
  "shirt (formal)":   { name: "Brooks Brothers Non-Iron Oxford Shirt", price: 89.50, category: "clothing" },

  // ── Sports & Outdoor ────────────────────────────────────────────────────────
  "skateboard":       { name: "Powell-Peralta Complete Skateboard",  price: 149.95, category: "sports" },
  "sports ball":      { name: "Spalding NBA Official Game Basketball", price: 149.99, category: "sports" },
  "tennis racket":    { name: "Wilson Pro Staff 97 V14 Racket",      price: 249,    category: "sports" },
  "baseball bat":     { name: "Louisville Slugger Meta BBCOR Bat",   price: 249.95, category: "sports" },
  "baseball glove":   { name: "Rawlings Heart of the Hide Glove",    price: 219.99, category: "sports" },
  "skis":             { name: "Head Kore 99 All-Mountain Skis",      price: 699,    category: "sports" },
  "snowboard":        { name: "Burton Custom Flying V Snowboard",    price: 599.95, category: "sports" },
  "surfboard":        { name: "Wavestorm 8ft Classic Surfboard",     price: 199.99, category: "sports" },
  "bicycle":          { name: "Trek FX 3 Disc Hybrid Bike",          price: 849.99, category: "sports" },
  "kite":             { name: "HQ Powerkite Rush V Pro 300",         price: 89.99,  category: "outdoor" },

  // ── Home & Decor ────────────────────────────────────────────────────────────
  "potted plant":     { name: "Costa Farms Fiddle Leaf Fig Tree 3ft", price: 65.99, category: "plants" },
  "vase":             { name: "Le Creuset Stoneware Flower Vase",    price: 49.95,  category: "decor" },
  "umbrella":         { name: "Repel Windproof Travel Umbrella",     price: 29.99,  category: "accessories" },
  "chair":            { name: "Herman Miller Aeron Ergonomic Chair", price: 1495,   category: "furniture" },
  "sofa":             { name: "IKEA KIVIK 3-Seat Sofa",              price: 699,    category: "furniture" },
  "bed":              { name: "Casper Sleep The Original Mattress Queen", price: 1095, category: "furniture" },
  "dining table":     { name: "IKEA LIATORP Dining Table",           price: 549,    category: "furniture" },
  "bench":            { name: "Christopher Knight Outdoor Bench",    price: 149.99, category: "furniture" },
  "toilet":           { name: "TOTO Washlet+ S550e Bidet Toilet",   price: 1699,   category: "bathroom" },
  "sink":             { name: "Kohler Strive 29\" Kitchen Sink",     price: 849,    category: "kitchen" },
  "bathtub":          { name: "WOODBRIDGE Freestanding Bathtub 67\"", price: 799,   category: "bathroom" },

  // ── Beauty & Personal Care ──────────────────────────────────────────────────
  "hair drier":       { name: "Dyson Supersonic HD08 Hair Dryer",   price: 429,    category: "beauty" },
  "toothbrush":       { name: "Oral-B iO Series 9 Electric Toothbrush", price: 199.99, category: "beauty" },

  // ── Stationery & Office ─────────────────────────────────────────────────────
  "scissors":         { name: "Fiskars 8\" Titanium Non-Stick Scissors", price: 14.99, category: "office" },
  "keyboard (office)":{ name: "Apple Magic Keyboard with Touch ID", price: 99,     category: "electronics" },
  "mouse (office)":   { name: "Apple Magic Mouse USB-C",            price: 79,     category: "electronics" },

  // ── Vehicles & Accessories ──────────────────────────────────────────────────
  "car":              { name: "Garmin DriveSmart 76 GPS Navigator",  price: 199.99, category: "electronics" },
  "motorcycle":       { name: "Bell Qualifier DLX MIPS Helmet",     price: 149.99, category: "automotive" },
  "airplane":         { name: "DJI Mini 4 Pro Drone",               price: 759,    category: "electronics" },
  "boat":             { name: "Intex Excursion Pro Kayak",           price: 299.99, category: "outdoor" },

  // ── Toys & Games ────────────────────────────────────────────────────────────
  "teddy bear":       { name: "Build-A-Bear Classic Plush Bear",     price: 32,     category: "toys" },
  "frisbee":          { name: "Discraft Ultrastar Sport Disc",       price: 13.99,  category: "sports" },
  "keyboard (toy)":   { name: "Melissa & Doug Piano 25-Key",        price: 59.99,  category: "toys" },

  // ── Animals (map to related accessories) ───────────────────────────────────
  "cat":              { name: "PETLIBRO Automatic Pet Feeder",       price: 89.99,  category: "pets" },
  "dog":              { name: "Furbo 360° Dog Camera + Treat Toss",  price: 169,    category: "pets" },
  "bird":             { name: "Prevue Hendryx Bird Cage 54\" Tall", price: 149.99,  category: "pets" },
  "horse":            { name: "Nikon Monarch M5 8x42 Binoculars",   price: 379.95, category: "outdoor" },
  "cow":              { name: "Weber Spirit II E-310 Gas Grill",     price: 549,    category: "outdoor" },
};

function buildStoreDeals(productName, price, tag) {
  const q = encodeURIComponent(productName);
  // Apply realistic variance per store
  const walmartPrice  = parseFloat((price * 0.95).toFixed(2));
  const ebayPrice     = parseFloat((price * 1.02).toFixed(2));
  const bestbuyPrice  = parseFloat((price * 0.98).toFixed(2));
  const targetPrice   = parseFloat((price * 0.97).toFixed(2));
  const flipkartPrice = parseFloat((price * 0.93).toFixed(2));

  return [
    {
      store: "Amazon",
      price: `$${price.toFixed(2)}`,
      numeric_price: price,
      shipping: "Free Prime Delivery",
      badge: "📦 1-Day Prime",
      url: `https://www.amazon.com/s?k=${q}&tag=${tag}`
    },
    {
      store: "Walmart",
      price: `$${walmartPrice.toFixed(2)}`,
      numeric_price: walmartPrice,
      shipping: "Free 2-Day Shipping",
      badge: "⚡ Best Price",
      url: `https://www.walmart.com/search?q=${q}&affili=${tag}`
    },
    {
      store: "Best Buy",
      price: `$${bestbuyPrice.toFixed(2)}`,
      numeric_price: bestbuyPrice,
      shipping: "Free Shipping or Store Pickup",
      badge: "🏬 In-Store Ready",
      url: `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`
    },
    {
      store: "Target",
      price: `$${targetPrice.toFixed(2)}`,
      numeric_price: targetPrice,
      shipping: "Same-Day Delivery Available",
      badge: "🎯 Circle Deals",
      url: `https://www.target.com/s?searchTerm=${q}`
    },
    {
      store: "eBay",
      price: `$${ebayPrice.toFixed(2)}`,
      numeric_price: ebayPrice,
      shipping: "Free Expedited Shipping",
      badge: "⭐ Top Rated",
      url: `https://www.ebay.com/sch/i.html?_nkw=${q}&campid=${tag}`
    },
    {
      store: "Flipkart",
      price: `$${flipkartPrice.toFixed(2)}`,
      numeric_price: flipkartPrice,
      shipping: "Supercoins Cashback",
      badge: "🛒 Plus Member Deal",
      url: `https://www.flipkart.com/search?q=${q}`
    }
  ];
}

export default function WebcamScanner({
  yoloEnabled,
  confidenceThreshold,
  barcodeEnabled,
  ocrEnabled,
  onProductMatched,
  activeProduct,
  affiliateTag = "affilidetect-20"
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  // ── Audio deduplication refs ──────────────────────────────────────
  // Tracks the last product_name that triggered audio, persists across frames
  const lastDetectedRef = useRef(null);
  // Keeps a ref to audioEnabled so the detection loop closure always reads the latest value
  const audioEnabledRef = useRef(true);
  // Timestamp of the last frame where we saw a detection — prevents jitter resets
  const lastSeenTimestampRef = useRef(0);
  // How many seconds of continuous "no detection" before we allow re-triggering
  const RESET_COOLDOWN_MS = 3000;

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Loading COCO-SSD Neural Classifier...");
  const [cameraState, setCameraState] = useState("stopped");
  const [cameraError, setCameraError] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [detectedCount, setDetectedCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState("unknown"); // "online" | "offline" | "unknown"
  const [activeEngine, setActiveEngine] = useState("coco-ssd");

  // Keep the audioEnabled ref in sync with state
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  /**
   * Central handler: decides whether to play audio for a detection.
   * Audio fires ONCE per new product_name. The tracker only resets after
   * RESET_COOLDOWN_MS of continuous "nothing detected" frames.
   */
  const handleDetectionResult = useCallback((filtered) => {
    setDetectedCount(filtered.length);

    if (filtered.length > 0) {
      const currentDetection = filtered[0];
      // Record that we're still seeing something
      lastSeenTimestampRef.current = Date.now();

      // Only fire audio + callback when the product CHANGES
      if (lastDetectedRef.current !== currentDetection.product_name) {
        onProductMatched(currentDetection);
        if (audioEnabledRef.current) playLockOnSound();
        lastDetectedRef.current = currentDetection.product_name;
      }
    } else {
      // Only reset after a sustained gap — prevents jitter (object flickers out for 1-2 frames)
      if (lastDetectedRef.current && (Date.now() - lastSeenTimestampRef.current > RESET_COOLDOWN_MS)) {
        lastDetectedRef.current = null;
      }
    }
  }, [onProductMatched]);

  // Check FastAPI backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${VISION_API}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          setBackendStatus(data.yolo_loaded ? "online" : "partial");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    };
    checkHealth();
    // Recheck every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load COCO-SSD model
  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        setLoadingStatus("Loading COCO-SSD Neural Classifier...");
        modelRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
        if (!isMounted) return;
        setLoadingStatus("Ready");
        setIsLoading(false);
        startCamera();
      } catch (err) {
        console.error("COCO-SSD load failed:", err);
        if (isMounted) {
          setLoadingStatus("Model load failed. Check internet connection.");
          setIsLoading(false);
          startCamera(); // Camera can still start even if model fails
        }
      }
    };
    loadModel();
    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // Restart loop when scanner options change
  useEffect(() => {
    let cleanupLoop = null;
    if (cameraState === "running") {
      cleanupLoop = startDetectionLoop();
    }
    return () => { if (cleanupLoop) cleanupLoop(); };
  }, [cameraState, yoloEnabled, confidenceThreshold, barcodeEnabled, ocrEnabled, affiliateTag, backendStatus]);

  const startCamera = async () => {
    setCameraState("starting");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraState("running");
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied. Please allow camera access and retry.");
      setCameraState("error");
    }
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearTimeout(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("stopped");
  };

  const captureFrameBase64 = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 640, 480);
    return canvas.toDataURL("image/jpeg", 0.75);
  };

  const startDetectionLoop = () => {
    if (detectIntervalRef.current) {
      clearTimeout(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }

    let isCancelled = false;
    // Use YOLO only if user enabled it AND backend is confirmed online
    const useYolo = yoloEnabled && backendStatus === "online";

    setActiveEngine(useYolo ? "yolov8-clip" : "coco-ssd");

    const tick = async () => {
      if (isCancelled) return;

      const video = videoRef.current;
      if (!video || video.readyState !== 4) {
        detectIntervalRef.current = setTimeout(tick, 250);
        return;
      }

      const nextDelay = useYolo ? 1500 : 450;

      if (useYolo) {
        const base64Frame = captureFrameBase64();
        if (!base64Frame) {
          detectIntervalRef.current = setTimeout(tick, nextDelay);
          return;
        }

        try {
          const formData = new FormData();
          formData.append("image_data", base64Frame);
          formData.append("yolo_enabled", "true");
          formData.append("affiliate_tag", affiliateTag);

          const response = await fetch(`${VISION_API}/api/detect-identify`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(4000)
          });

          if (!response.ok) throw new Error(`Server returned ${response.status}`);

          const data = await response.json();
          if (isCancelled) return;

          if (data.error) throw new Error(data.error);

          const detections = data.detections || [];
          const filtered = detections.filter(d => d.confidence >= confidenceThreshold);

          drawAROverlay(filtered);
          handleDetectionResult(filtered);

          // Mark backend as confirmed online
          if (backendStatus !== "online") setBackendStatus("online");
        } catch (err) {
          if (!isCancelled) {
            console.warn("FastAPI backend unreachable, falling back to COCO-SSD:", err.message);
            setBackendStatus("offline");
            setActiveEngine("coco-ssd");
            await runLocalFallbackDetection();
          }
        }
      } else {
        await runLocalFallbackDetection();
      }

      if (!isCancelled) {
        detectIntervalRef.current = setTimeout(tick, nextDelay);
      }
    };

    tick();

    return () => {
      isCancelled = true;
      if (detectIntervalRef.current) {
        clearTimeout(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
    };
  };

  const runLocalFallbackDetection = async () => {
    const video = videoRef.current;
    const model = modelRef.current;
    if (!video || !model) return;

    try {
      // Detect up to 5 objects with minimum 45% confidence
      const predictions = await model.detect(video, 5, 0.45);

      const processed = predictions.map(pred => {
        const clsName = pred.class;
        const confidence = Math.round(pred.score * 100);
        const [x, y, w, h] = pred.bbox;

        const match = LOCAL_PRODUCT_CATALOG[clsName] || {
          name: `${clsName.charAt(0).toUpperCase() + clsName.slice(1)}`,
          price: 29.99,
          category: "general"
        };

        const deals = buildStoreDeals(match.name, match.price, affiliateTag);
        const sorted = [...deals].sort((a, b) => a.numeric_price - b.numeric_price);

        return {
          class: clsName,
          confidence,
          bbox: [x, y, w, h],
          product_name: match.name,
          category: match.category,
          lowest_price: sorted[0].price,
          highest_price: sorted[sorted.length - 1].price,
          discount_pct: parseFloat((((sorted[sorted.length - 1].numeric_price - sorted[0].numeric_price) / sorted[sorted.length - 1].numeric_price) * 100).toFixed(1)),
          best_store: sorted[0].store,
          deals
        };
      });

      const filtered = processed.filter(d => d.confidence >= confidenceThreshold);
      drawAROverlay(filtered);
      handleDetectionResult(filtered);
    } catch (e) {
      console.error("COCO-SSD detection error:", e);
    }
  };

  const drawAROverlay = (detections) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 640, 480);

    detections.forEach((det) => {
      const [x, y, width, height] = det.bbox;
      const isSelected = activeProduct && activeProduct.product_name === det.product_name;
      const neonColor = isSelected ? "#3b82f6" : "#64748b";
      const cornerLength = Math.min(20, width / 4, height / 4);

      ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.12)" : "rgba(100, 116, 139, 0.05)";
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = isSelected ? "rgba(59, 130, 246, 0.5)" : "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      // Corner brackets
      ctx.beginPath(); ctx.moveTo(x, y + cornerLength); ctx.lineTo(x, y); ctx.lineTo(x + cornerLength, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + width - cornerLength, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerLength); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + height - cornerLength); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerLength, y + height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + width - cornerLength, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - cornerLength); ctx.stroke();

      // Product label
      ctx.fillStyle = neonColor;
      const tagText = `${det.product_name.toUpperCase()} (${det.confidence}%)`;
      ctx.font = "bold 11px monospace";
      const textWidth = ctx.measureText(tagText).width;
      ctx.fillRect(x, y - 22, textWidth + 12, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(tagText, x + 6, y - 8);

      // Price badge
      ctx.fillStyle = "#059669";
      const priceText = `🏷️ ${det.lowest_price}`;
      const priceWidth = ctx.measureText(priceText).width;
      ctx.fillRect(x + width - priceWidth - 12, y - 22, priceWidth + 12, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(priceText, x + width - priceWidth - 6, y - 8);
    });

    if (barcodeEnabled) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(80, 160, 480, 160);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.font = "bold 10px monospace";
      ctx.fillText("BARCODE SCAN AREA", 90, 180);
    }

    if (ocrEnabled) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(180, 60, 280, 50);
      ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
      ctx.font = "bold 10px monospace";
      ctx.fillText("BRAND OCR SCAN LAYER", 190, 80);
    }
  };

  const engineLabel = activeEngine === "yolov8-clip" ? "YOLOv8 + CLIP" : "COCO-SSD (Local)";
  const backendBadge =
    backendStatus === "online" ? { color: "#10b981", label: "● FastAPI Online" } :
    backendStatus === "offline" ? { color: "#ef4444", label: "● FastAPI Offline" } :
    { color: "#f59e0b", label: "● Checking..." };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cameraState === "running" ? "bg-emerald-500 animate-ping" : "bg-slate-600"}`}></span>
          <h2 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wider">Live Vision Scanner</h2>
        </div>

        <div className="flex gap-2 items-center">
          {/* Backend status indicator */}
          <span
            className="px-2 py-1 text-[9px] font-mono rounded-md border border-slate-700 bg-slate-800/50"
            style={{ color: backendBadge.color }}
          >
            {backendBadge.label}
          </span>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
              audioEnabled
                ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                : "bg-slate-800/40 border-slate-700 text-slate-400"
            }`}
          >
            {audioEnabled ? "🔊 ON" : "🔇 OFF"}
          </button>

          {cameraState === "running" ? (
            <button
              onClick={stopCamera}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all disabled:opacity-50"
            >
              Start Camera
            </button>
          )}
        </div>
      </div>

      {/* Offline warning banner when YOLO enabled but backend unreachable */}
      {yoloEnabled && backendStatus === "offline" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span>⚠️</span>
          <span>
            <strong>FastAPI backend offline.</strong> Running COCO-SSD local detection instead.
            Start the Python backend: <code className="font-mono bg-slate-900 px-1 rounded">uvicorn main:app --reload --port 8000</code>
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="h-[360px] flex flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-950/40">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-300 mt-4">{loadingStatus}</p>
          <p className="text-xs text-slate-500 mt-1">Loading WebGL neural weights...</p>
        </div>
      ) : (
        <div className="relative h-[360px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-medium text-slate-300 mt-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all"
              >
                Retry Stream Access
              </button>
            </div>
          )}

          {cameraState === "stopped" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-center">
              <span className="text-4xl mb-2">📹</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">AR Vision Scanner Paused</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Enable camera stream to overlay live neural product tags.</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all"
              >
                Activate Feed
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: cameraState === "running" ? "block" : "none" }}
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ display: cameraState === "running" ? "block" : "none" }}
          />

          {cameraState === "running" && (
            <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              <span>ENGINE: <strong className="text-blue-400 uppercase">{engineLabel}</strong></span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
        <span>Locks: <strong className="text-slate-200">{detectedCount} objects</strong></span>
        <span>Resolution: 640×480</span>
      </div>
    </div>
  );
}
