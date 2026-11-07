import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Camera, Download, ShieldCheck, CheckCircle2, 
  RotateCw, RefreshCw, FileText, Sparkles, AlertCircle, Copy
} from 'lucide-react';
import { 
  IDCardLayoutMode, 
  compositeIDCardsToCanvas, 
  generateIDCardCompositePDF 
} from '../services/idCardService';
import { NotifySystem } from '../types';

interface IDCardComposerProps {
  darkMode: boolean;
  notify?: NotifySystem;
}

export const IDCardComposer: React.FC<IDCardComposerProps> = ({ darkMode, notify }) => {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [layoutMode, setLayoutMode] = useState<IDCardLayoutMode>('actual_1to1');
  const [showCuttingGuide, setShowCuttingGuide] = useState<boolean>(true);

  // Anti-Theft Security Watermark state
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkPurpose, setWatermarkPurpose] = useState<string>('KYC VERIFICATION');
  const [watermarkEntity, setWatermarkEntity] = useState<string>('BANK');
  const [watermarkColor, setWatermarkColor] = useState<string>('rgba(220, 38, 38, 0.22)'); // Security Red

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

  // Full composite watermark text
  const fullWatermarkText = `ONLY FOR ${watermarkPurpose} AT ${watermarkEntity} ON ${todayStr} - NOT VALID FOR ANY OTHER PURPOSE`;

  // Update object URLs on file changes
  useEffect(() => {
    if (frontFile) {
      const url = URL.createObjectURL(frontFile);
      setFrontPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFrontPreview(null);
    }
  }, [frontFile]);

  useEffect(() => {
    if (backFile) {
      const url = URL.createObjectURL(backFile);
      setBackPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setBackPreview(null);
    }
  }, [backFile]);

  // Recompute composite preview when inputs change
  useEffect(() => {
    let active = true;

    async function updatePreview() {
      if (!frontFile) {
        setPreviewDataUrl(null);
        return;
      }

      try {
        const canvas = await compositeIDCardsToCanvas({
          frontImage: frontFile,
          backImage: backFile,
          layoutMode,
          showCuttingGuide,
          watermark: watermarkEnabled ? {
            enabled: true,
            text: fullWatermarkText,
            color: watermarkColor
          } : undefined
        });

        if (active) {
          // Render low-res preview data URL for instant 60 FPS UI responsiveness
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (err) {
        console.error('Failed to generate composite preview:', err);
      }
    }

    updatePreview();
    return () => { active = false; };
  }, [frontFile, backFile, layoutMode, showCuttingGuide, watermarkEnabled, fullWatermarkText, watermarkColor]);

  // Download high-resolution print-ready A4 PDF
  const handleDownloadPDF = async () => {
    if (!frontFile) {
      notify?.error?.();
      return;
    }

    setIsProcessing(true);
    try {
      const pdfBytes = await generateIDCardCompositePDF({
        frontImage: frontFile,
        backImage: backFile,
        layoutMode,
        showCuttingGuide,
        watermark: watermarkEnabled ? {
          enabled: true,
          text: fullWatermarkText,
          color: watermarkColor
        } : undefined
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ID_Card_A4_Single_Page_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notify?.complete?.();
    } catch (err) {
      console.error(err);
      notify?.error?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Download high-res composited JPEG image
  const handleDownloadJPG = async () => {
    if (!frontFile) return;

    setIsProcessing(true);
    try {
      const canvas = await compositeIDCardsToCanvas({
        frontImage: frontFile,
        backImage: backFile,
        layoutMode,
        showCuttingGuide,
        watermark: watermarkEnabled ? {
          enabled: true,
          text: fullWatermarkText,
          color: watermarkColor
        } : undefined
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ID_Card_A4_Composite_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify?.complete?.();
        setIsProcessing(false);
      }, 'image/jpeg', 0.94);
    } catch (err) {
      console.error(err);
      notify?.error?.();
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-2 px-2 sm:px-4">
      {/* 1. UPLOAD SLOTS: FRONT & BACK OF ID CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Slot 1: Front Side */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0e1422]/70 border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[11px]">1</span>
              Front Side of ID Card
            </span>
            {frontFile && (
              <button
                type="button"
                onClick={() => setFrontFile(null)}
                className="text-[11px] text-red-500 hover:underline cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          {frontPreview ? (
            <div className="relative aspect-[1.586/1] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 group">
              <img src={frontPreview} alt="ID Front" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => frontInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              >
                <RefreshCw size={14} /> Change Photo
              </button>
            </div>
          ) : (
            <div 
              onClick={() => frontInputRef.current?.click()}
              className="aspect-[1.586/1] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/30"
            >
              <Upload size={28} className="text-amber-500 mb-1" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Upload Front Photo
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Aadhaar Front, PAN, Driver's License
              </span>
            </div>
          )}
          <input
            ref={frontInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFrontFile(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Slot 2: Back Side */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0e1422]/70 border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[11px]">2</span>
              Back Side of ID Card (With QR Code)
            </span>
            {backFile && (
              <button
                type="button"
                onClick={() => setBackFile(null)}
                className="text-[11px] text-red-500 hover:underline cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          {backPreview ? (
            <div className="relative aspect-[1.586/1] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 group">
              <img src={backPreview} alt="ID Back" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => backInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              >
                <RefreshCw size={14} /> Change Photo
              </button>
            </div>
          ) : (
            <div 
              onClick={() => backInputRef.current?.click()}
              className="aspect-[1.586/1] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/30"
            >
              <Upload size={28} className="text-amber-500 mb-1" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Upload Back Photo
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Address side with QR Code
              </span>
            </div>
          )}
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setBackFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* 2. CONTROLS: LAYOUT PRESET & ANTI-THEFT WATERMARK */}
      <div className={`p-4 rounded-2xl border mb-6 ${
        darkMode ? 'bg-[#0e1422]/90 border-white/[0.08]' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Layout Presets */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              A4 Page Placement Mode
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode('actual_1to1')}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  layoutMode === 'actual_1to1'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-bold">1:1 Actual Physical Size (Print & Laminate)</div>
                  <div className="text-[11px] opacity-75">85.6mm x 54mm standard ISO ID-1 scale on A4</div>
                </div>
                {layoutMode === 'actual_1to1' && <CheckCircle2 size={16} className="text-amber-500 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('kyc_zoom')}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  layoutMode === 'kyc_zoom'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-bold">KYC Portal Zoom (1.5x Enlarged for Verification)</div>
                  <div className="text-[11px] opacity-75">Maximized clarity for bank officers & exam portal validators</div>
                </div>
                {layoutMode === 'kyc_zoom' && <CheckCircle2 size={16} className="text-amber-500 shrink-0" />}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="showGuideCheck"
                checked={showCuttingGuide}
                onChange={(e) => setShowCuttingGuide(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="showGuideCheck" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Show card borders & center cut / fold line
              </label>
            </div>
          </div>

          {/* Anti-Theft Watermark Toggle & Customizer */}
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Anti-Theft Security Watermark
              </label>
              <input
                type="checkbox"
                id="antiTheftCheck"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Recommended by UIDAI & RBI: stamps a repeating diagonal purpose lattice to prevent unauthorized reuse or loan fraud.
            </p>

            {watermarkEnabled && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Purpose</label>
                    <input
                      type="text"
                      value={watermarkPurpose}
                      onChange={(e) => setWatermarkPurpose(e.target.value)}
                      placeholder="e.g. KYC VERIFICATION"
                      className={`w-full p-2 text-xs rounded-lg border font-semibold outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Recipient / Bank</label>
                    <input
                      type="text"
                      value={watermarkEntity}
                      onChange={(e) => setWatermarkEntity(e.target.value)}
                      placeholder="e.g. SBI BANK"
                      className={`w-full p-2 text-xs rounded-lg border font-semibold outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Color:</span>
                  <button
                    type="button"
                    onClick={() => setWatermarkColor('rgba(220, 38, 38, 0.22)')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      watermarkColor.includes('220') ? 'border-red-500 bg-red-500/20 text-red-500' : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    Security Red
                  </button>
                  <button
                    type="button"
                    onClick={() => setWatermarkColor('rgba(15, 43, 92, 0.22)')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      watermarkColor.includes('92') ? 'border-blue-500 bg-blue-500/20 text-blue-500' : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    Bank Navy
                  </button>
                  <button
                    type="button"
                    onClick={() => setWatermarkColor('rgba(30, 41, 59, 0.20)')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      watermarkColor.includes('30') ? 'border-slate-500 bg-slate-500/20 text-slate-400' : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    Muted Slate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. LIVE A4 PREVIEW & ACTION DOWNLOAD BUTTONS */}
      {previewDataUrl ? (
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Live A4 Sheet Preview (Print-Ready 300 DPI Rendering)
          </div>

          <div className="max-w-xs sm:max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 bg-white">
            <img 
              src={previewDataUrl} 
              alt="A4 ID Card Composite Preview" 
              className="w-full h-auto object-contain select-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download size={18} />
              <span>{isProcessing ? 'Generating PDF...' : 'Download Print-Ready A4 PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJPG}
              disabled={isProcessing}
              className={`px-5 py-3.5 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <FileText size={18} />
              <span>Download A4 Image (JPG)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs">
          Upload at least the Front side of your card to preview the A4 composite layout.
        </div>
      )}

      {/* Privacy Guarantee Footer */}
      <div className="text-center pt-2 pb-1 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>100% Private In-Browser Processing: ID numbers and photos are processed in local device RAM and never uploaded to any server.</span>
      </div>
    </div>
  );
};

export default IDCardComposer;
