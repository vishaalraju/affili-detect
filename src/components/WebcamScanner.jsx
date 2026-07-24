import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

// Web Audio API lock-on sound generator for sci-fi feel
const playLockOnSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08); // A6 note
    
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch {
    // Audio context may be restricted before user gesture
  }
};

// Estimated price lookup dictionary for live AR floating badges
const ESTIMATED_PRICES = {
  person: "$149.99",
  cup: "$35.00",
  bottle: "$39.95",
  "cell phone": "$149.95",
  laptop: "$899.00",
  keyboard: "$109.99",
  mouse: "$99.99",
  book: "$14.99",
  backpack: "$29.99",
  chair: "$129.99",
  scissors: "$8.49",
  remote: "$12.99",
  toothbrush: "$44.99",
  "potted plant": "$24.99",
  "sports ball": "$29.95",
  handbag: "$39.99",
  "teddy bear": "$16.99",
  clock: "$18.99",
  vase: "$21.99"
};

// Prioritize reliable matches over showing every possible detection.
const MIN_DETECTION_CONFIDENCE = 0.7;
const MAX_DETECTIONS = 10;

export default function WebcamScanner({ onDetectObjects, onSelectProduct, selectedClass }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const prevClassesRef = useRef([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Initializing TensorFlow AI Engine...");
  const [cameraState, setCameraState] = useState("stopped"); // 'stopped', 'starting', 'running', 'error'
  const [cameraError, setCameraError] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [detectedCount, setDetectedCount] = useState(0);

  // Load COCO-SSD Model
  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        setLoadingStatus("Loading Neural Vision Network (COCO-SSD)...");
        // MobileNet V2 is the more accurate COCO-SSD base model. It is a
        // little slower to load than the lite model, but produces better
        // classifications for the objects this model was trained to recognize.
        modelRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
        if (!isMounted) return;
        setLoadingStatus("AI Model Ready!");
        setIsLoading(false);
        startCamera();
      } catch (err) {
        console.error("Failed to load model:", err);
        if (isMounted) setLoadingStatus("Model load failed. Please refresh.");
      }
    };
    loadModel();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraState("starting");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraState("running");
          startDetection();
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unequipped. You can still test demo targets on the right!");
      setCameraState("error");
    }
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, 640, 480);
    }
    setCameraState("stopped");
  };

  const startDetection = () => {
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);

    detectIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const model = modelRef.current;

      if (!video || !model || video.readyState !== 4) return;

      try {
        const predictions = await model.detect(
          video,
          MAX_DETECTIONS,
          MIN_DETECTION_CONFIDENCE
        );
        
        if (predictions.length > 0) {
          const processed = predictions.map((pred) => ({
            class: pred.class,
            confidence: Math.round(pred.score * 100),
            bbox: pred.bbox,
            price: ESTIMATED_PRICES[pred.class] || "$19.99"
          }));

          setDetectedCount(processed.length);
          onDetectObjects(processed);

          // Audio cue on new target discovery
          const currentClasses = processed.map(p => p.class);
          const hasNewClass = currentClasses.some(c => !prevClassesRef.current.includes(c));
          if (hasNewClass && audioEnabled) {
            playLockOnSound();
          }
          prevClassesRef.current = currentClasses;

          drawCyberpunkARHUD(predictions);
        } else {
          setDetectedCount(0);
          onDetectObjects([]);
          prevClassesRef.current = [];
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, 640, 480);
          }
        }
      } catch (err) {
        console.error("Detection cycle error:", err);
      }
    }, 350);
  };

  // Futuristic AR HUD Canvas Renderer
  const drawCyberpunkARHUD = (predictions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 640, 480);

    predictions.forEach((pred) => {
      const [x, y, width, height] = pred.bbox;
      const scorePercent = Math.round(pred.score * 100);
      const isSelected = pred.class === selectedClass;
      
      const neonColor = isSelected ? "#2563eb" : "#64748b";
      const cornerLength = Math.min(24, width / 4, height / 4);

      // 1. Draw Glass Box Fill
      ctx.fillStyle = isSelected ? "rgba(37, 99, 235, 0.12)" : "rgba(100, 116, 139, 0.08)";
      ctx.fillRect(x, y, width, height);

      // 2. Draw Subtle Border Line
      ctx.strokeStyle = isSelected ? "rgba(37, 99, 235, 0.4)" : "rgba(100, 116, 139, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      // 3. Draw Cyberpunk Sci-Fi Corner Reticles
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      // Top-Left Reticle
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();

      // Top-Right Reticle
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLength);
      ctx.stroke();

      // Bottom-Left Reticle
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLength);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLength, y + height);
      ctx.stroke();

      // Bottom-Right Reticle
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLength);
      ctx.stroke();

      // 4. Draw Center Crosshair
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // 5. Floating Class Label Banner
      ctx.fillStyle = neonColor;
      const labelText = `⚡ ${pred.class.toUpperCase()} [${scorePercent}%]`;
      ctx.font = "900 12px monospace";
      const textWidth = ctx.measureText(labelText).width;
      
      ctx.fillRect(x - 1, y - 26, textWidth + 14, 24);
      ctx.fillStyle = "#000000";
      ctx.fillText(labelText, x + 6, y - 9);

      // 6. Floating Price Tag Badge (Top Right Corner)
      const priceText = ESTIMATED_PRICES[pred.class] || "$19.99";
      ctx.fillStyle = "#059669"; // Professional success green
      ctx.fillRect(x + width - 75, y - 26, 76, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`🏷️ ${priceText}`, x + width - 70, y - 9);
    });
  };

  return (
    <div className="detector-card card cyberpunk-border">
      <div className="card-header">
        <div className="header-status">
          <span className={`status-dot ${cameraState === "running" ? "active" : ""}`}></span>
          <div>
            <h2>Live AR Target Scanner</h2>
            <span className="telemetry-badge">
              {cameraState === "running" ? `LOCKS: ${detectedCount} OBJECTS` : "STANDBY MODE"}
            </span>
          </div>
        </div>
        <div className="camera-controls">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`btn-icon ${audioEnabled ? "active" : ""}`}
            title="Toggle Lock-On Sound Effects"
          >
            {audioEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
          </button>
          {cameraState === "running" ? (
            <button onClick={stopCamera} className="btn btn-danger">
              Pause Feed
            </button>
          ) : (
            <button onClick={startCamera} className="btn btn-success" disabled={cameraState === "starting"}>
              {cameraState === "starting" ? "Initializing..." : "Start Camera"}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <h3>{loadingStatus}</h3>
          <p className="status-text">TensorFlow.js WebGL GPU Acceleration</p>
        </div>
      ) : (
        <div className="video-container">
          {cameraState === "error" && (
            <div className="error-overlay">
              <span className="overlay-emoji">⚠️</span>
              <p>{cameraError}</p>
              <button onClick={startCamera} className="btn btn-primary">
                Retry Camera Access
              </button>
            </div>
          )}

          {cameraState === "stopped" && (
            <div className="stopped-overlay">
              <span className="camera-icon-emoji">📡</span>
              <h3>AR Vision Telemetry Paused</h3>
              <p>Turn on camera to enable real-time floating price tags.</p>
              <button onClick={startCamera} className="btn btn-primary">
                Activate AR Scanner
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width="640"
            height="480"
            style={{ display: cameraState === "running" ? "block" : "none" }}
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            style={{ display: cameraState === "running" ? "block" : "none" }}
          />

          {/* AR Telemetry HUD Overlay overlay */}
          {cameraState === "running" && (
            <div className="ar-telemetry-hud">
              <span className="hud-corner top-left"></span>
              <span className="hud-corner top-right"></span>
              <span className="hud-corner bottom-left"></span>
              <span className="hud-corner bottom-right"></span>
              <div className="hud-scanner-bar"></div>
            </div>
          )}
        </div>
      )}

      <div className="detector-info">
        <p>
          ⚡ <strong>Cyberpunk AR Engine:</strong> Real-time neural bounding boxes + live floating price estimates.
          Hold items in front of your camera to auto-match affiliate deals!
        </p>
      </div>
    </div>
  );
}
