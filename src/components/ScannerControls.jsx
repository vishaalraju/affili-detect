import React from "react";

export default function ScannerControls({
  yoloEnabled,
  onToggleYolo,
  voiceEnabled,
  onToggleVoice,
  barcodeEnabled,
  onToggleBarcode,
  ocrEnabled,
  onToggleOcr,
  confidenceThreshold,
  onChangeConfidence,
  onClearHistory,
  historyCount
}) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-left flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">AR Vision Controls</h3>
        <p className="text-xs text-slate-400 mt-1">Configure live neural model pipeline & feedback outputs.</p>
      </div>

      {/* Switches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* YOLO Toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Server YOLOv8</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Compute dense boxes</span>
          </div>
          <input
            type="checkbox"
            checked={yoloEnabled}
            onChange={(e) => onToggleYolo(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* Voice Toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Voice Synthesis</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Read deal highlights</span>
          </div>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => onToggleVoice(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* Barcode Toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Barcode Finder</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Match UPC codes</span>
          </div>
          <input
            type="checkbox"
            checked={barcodeEnabled}
            onChange={(e) => onToggleBarcode(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* OCR Toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">OCR Brand Text</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Extract brand names</span>
          </div>
          <input
            type="checkbox"
            checked={ocrEnabled}
            onChange={(e) => onToggleOcr(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>
      </div>

      {/* Confidence Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-slate-300">
          <span className="font-semibold">Match Bounding Confidence</span>
          <span className="font-mono text-blue-400 font-bold">{confidenceThreshold}%</span>
        </div>
        <input
          type="range"
          min="40"
          max="95"
          value={confidenceThreshold}
          onChange={(e) => onChangeConfidence(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-[9px] text-slate-500">Lower values detect more objects, higher values avoid false locks.</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
        <span className="text-xs text-slate-400 font-mono">History Log: <strong className="text-slate-200 font-bold">{historyCount} items</strong></span>
        <button
          onClick={onClearHistory}
          disabled={historyCount === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-400 border border-rose-950/20 bg-rose-500/10 hover:bg-rose-500/20 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}
