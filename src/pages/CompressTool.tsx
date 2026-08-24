import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { inspectPdfForCompression, compressPdfAdvanced, PdfCompressionStats, CompressionResult, CompressionOptions } from '../services/pdfService';
import FileUploader from '../components/FileUploader';
import ProgressBar from '../components/ProgressBar';
import { formatFileSize, validateOutputIntegrity } from '../utils/fileValidation';
import { saveAs } from 'file-saver';
import { apiClient } from '../services/apiClient';
import AdSlot from '../components/AdSlot';
import { NotifySystem } from '../types';
import { useActiveWork } from '../context/ActiveWorkContext';
import { 
  Sparkles, 
  FileText, 
  Sliders, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  Eye, 
  ShieldCheck, 
  Zap, 
  Check, 
  Star, 
  Target,
  Maximize2
} from 'lucide-react';

interface CompressToolProps {
  darkMode: boolean;
  notify: NotifySystem;
}

type ProfileType = 'max' | 'high' | 'balanced' | 'high-compression' | 'extreme' | 'custom';

const CompressTool: React.FC<CompressToolProps> = ({ darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();
  const [file, setFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [stats, setStats] = useState<PdfCompressionStats | null>(null);
  
  // Configuration
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>('balanced');
  const [targetMode, setTargetMode] = useState<'auto' | 'preset' | 'custom'>('auto');
  const [targetSizeMB, setTargetSizeMB] = useState<number>(5);
  
  // Custom Controls
  const [customQuality, setCustomQuality] = useState<number>(75);
  const [customDpi, setCustomDpi] = useState<number>(150);
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);
  const [useObjectStreams, setUseObjectStreams] = useState<boolean>(true);

  // Processing & Results
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Sync active work
  React.useEffect(() => {
    setHasActiveWork((file !== null && !result) || processing);
    return () => setHasActiveWork(false);
  }, [file, result, processing, setHasActiveWork]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setInspecting(true);
    setStats(null);
    setResult(null);
    notify.upload();

    try {
      const inspected = await inspectPdfForCompression(selectedFile);
      setStats(inspected);
      setSelectedProfile(inspected.recommendedProfile);
      notify.complete();
    } catch (err) {
      console.error('Inspection failed', err);
      notify.error();
    } finally {
      setInspecting(false);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(15);
    setResult(null);

    try {
      const isBackendUp = await apiClient.checkBackend();

      if (isBackendUp) {
        setProgress(35);
        const settingsPayload = {
          profile: targetMode !== 'auto' ? 'target' : selectedProfile,
          target_size_mb: targetMode !== 'auto' ? targetSizeMB : undefined,
          custom_dpi: customDpi,
          custom_quality: customQuality,
          strip_metadata: stripMetadata
        };

        const backendRes = await apiClient.submitJob('compress', file, settingsPayload);
        setProgress(85);

        const arrayBuf = await backendRes.outputBlob.arrayBuffer();
        const compressedBytes = new Uint8Array(arrayBuf);

        const outValidation = await validateOutputIntegrity(compressedBytes, 'pdf');
        if (!outValidation.valid) {
          throw new Error(outValidation.error || "Compressed output failed integrity verification.");
        }

        const metrics = backendRes.metrics;
        setResult({
          compressedBytes,
          originalSizeBytes: metrics.original_size_bytes,
          compressedSizeBytes: metrics.output_size_bytes,
          savedBytes: metrics.saved_bytes,
          savedPercent: metrics.reduction_percent
        });

        setProgress(100);
        notify.success();
        return;
      }

      // Local Client Engine Fallback
      const options: CompressionOptions = {
        profile: targetMode !== 'auto' ? 'target' : selectedProfile,
        targetSizeMB: targetMode !== 'auto' ? targetSizeMB : undefined,
        customDpi,
        customQuality: customQuality / 100,
        stripMetadata,
        useObjectStreams
      };

      const compressedResult = await compressPdfAdvanced(file, options, (pct) => {
        setProgress(pct);
      });

      // Output Validation Stage
      const outValidation = await validateOutputIntegrity(compressedResult.compressedBytes, 'pdf');
      if (!outValidation.valid) {
        throw new Error(outValidation.error || "Compressed PDF failed integrity verification.");
      }

      setResult(compressedResult);
      notify.success();
    } catch (err) {
      console.error('Compression failed', err);
      notify.error();
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const blob = new Blob([result.compressedBytes as any], { type: 'application/pdf' });
    const name = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
    saveAs(blob, name);
    notify.complete();
  };

  const profiles: { id: ProfileType; title: string; stars: string; quality: string; comp: string; bestFor: string; isRecommended?: boolean }[] = [
    {
      id: 'max',
      title: 'Maximum Quality',
      stars: '★★★★★',
      quality: 'Maximum (300 DPI)',
      comp: 'Low (15–30%)',
      bestFor: 'Printing & Archival documents'
    },
    {
      id: 'high',
      title: 'High Quality',
      stars: '★★★★☆',
      quality: 'High (200 DPI)',
      comp: 'Moderate (35–50%)',
      bestFor: 'Professional & Business presentations'
    },
    {
      id: 'balanced',
      title: 'Balanced',
      stars: '★★★★☆',
      quality: 'Balanced (150 DPI)',
      comp: 'High (50–70%)',
      bestFor: 'General office & sharing',
      isRecommended: true
    },
    {
      id: 'high-compression',
      title: 'High Compression',
      stars: '★★★☆☆',
      quality: 'Standard (96 DPI)',
      comp: 'Very High (65–80%)',
      bestFor: 'Email attachments & web upload'
    },
    {
      id: 'extreme',
      title: 'Extreme Compression',
      stars: '★★☆☆☆',
      quality: 'Screen (72 DPI)',
      comp: 'Maximum (75–90%)',
      bestFor: 'Strict portal limits (<2MB)'
    },
    {
      id: 'custom',
      title: 'Custom Profile',
      stars: '⚙️',
      quality: 'User-Defined',
      comp: 'Custom',
      bestFor: 'Granular DPI & JPEG adjustments'
    }
  ];

  return (
    <div className="animate-fadeIn">
      <div className="max-w-4xl mx-auto px-4 py-2">
        {/* Upload State */}
        {!stats && !result && (

          <div className="max-w-2xl mx-auto">
            {inspecting ? (
              <div className={`p-16 rounded-[2.5rem] border text-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Analyzing Document Composition...
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Calculating original file weight, image density, font subsets, and recommending the optimal compression profile...
                </p>
              </div>
            ) : (
              <FileUploader
                onFilesSelected={handleFilesSelected}
                accept=".pdf"
                multiple={false}
                darkMode={darkMode}
              />
            )}
          </div>
        )}

        {/* Configuration & Processing State */}
        {stats && !result && (
          <div className="space-y-8 animate-slideDown">
            {/* Document Analysis Card */}
            <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
              darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center flex-shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">✓ Document Analyzed</span>
                    <span className="text-[10px] font-bold text-slate-400">• {stats.detectedType.toUpperCase()}</span>
                  </div>
                  <h3 className={`text-lg sm:text-xl font-black truncate max-w-md ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {stats.fileName}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400 mt-1">
                    <span>Original Size: <strong className="text-yellow-500">{formatFileSize(stats.originalSizeBytes)}</strong></span>
                    <span>•</span>
                    <span>{stats.pageCount} Pages</span>
                    <span>•</span>
                    <span>{stats.imageCount} Images</span>
                    <span>•</span>
                    <span>{stats.fontCount} Fonts</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setStats(null); setFile(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw size={12} /> Switch File
              </button>
            </div>

            {/* Smart Recommendation Banner */}
            <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
              darkMode ? 'bg-yellow-950/20 border-yellow-500/30 text-yellow-200' : 'bg-yellow-50/80 border-yellow-200 text-yellow-900'
            }`}>
              <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-black uppercase tracking-wider block mb-0.5">
                  AI Recommendation: {stats.recommendedProfile.toUpperCase()} (Expected Reduction: {stats.expectedReductionPercent})
                </span>
                {stats.recommendationReason}
              </div>
            </div>

            {/* Profile Selection Grid */}
            <div className={`p-8 rounded-3xl border space-y-6 ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Sliders size={18} className="text-yellow-500" /> Choose Compression Profile
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(p => {
                  const isSelected = selectedProfile === p.id && targetMode === 'auto';
                  const isRecommended = stats.recommendedProfile === p.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedProfile(p.id); setTargetMode('auto'); }}
                      className={`p-5 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-yellow-500 bg-yellow-500/10 shadow-md ring-2 ring-yellow-500/20 scale-[1.02]'
                          : darkMode
                            ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {isRecommended && (
                          <span className="inline-block mb-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-500 text-slate-950">
                            ⭐ Recommended
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {p.title}
                          </h4>
                          <span className="text-xs text-yellow-500">{p.stars}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {p.bestFor}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50 mt-4 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>Quality: {p.quality}</span>
                        <span className="text-emerald-500">{p.comp}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Settings Panel (if custom selected) */}
              {selectedProfile === 'custom' && targetMode === 'auto' && (
                <div className={`p-6 rounded-2xl border space-y-4 animate-slideDown ${
                  darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Granular Custom Controls
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>JPEG Quality</span>
                        <span className="text-yellow-500">{customQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="95"
                        value={customQuality}
                        onChange={(e) => setCustomQuality(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Target Resolution DPI</span>
                        <span className="text-yellow-500">{customDpi} DPI</span>
                      </div>
                      <div className="flex gap-2">
                        {[72, 96, 150, 200, 300].map(dpi => (
                          <button
                            key={dpi}
                            type="button"
                            onClick={() => setCustomDpi(dpi)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              customDpi === dpi
                                ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                                : darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'
                            }`}
                          >
                            {dpi}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Target File Size Selector */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Target size={16} className="text-yellow-500" /> Target Maximum File Size (Optional)
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">Constraint limits</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    { label: 'Auto (Best Balance)', val: 'auto' },
                    { label: '< 15 MB', val: 15 },
                    { label: '< 10 MB (Email)', val: 10 },
                    { label: '< 5 MB (Portal)', val: 5 },
                    { label: '< 2 MB (Gov/Job)', val: 2 },
                  ].map((preset, idx) => {
                    const isSelected = preset.val === 'auto' ? targetMode === 'auto' : targetMode === 'preset' && targetSizeMB === preset.val;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (preset.val === 'auto') {
                            setTargetMode('auto');
                          } else {
                            setTargetMode('preset');
                            setTargetSizeMB(preset.val as number);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-yellow-500 text-slate-950 font-black border-yellow-500 shadow-sm scale-105'
                            : darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Compress Action */}
            <div>
              {processing ? (
                <ProgressBar
                  progress={progress}
                  label="Downsampling & Compressing Streams..."
                  fileName={file.name}
                  darkMode={darkMode}
                  status="processing"
                />
              ) : (
                <button
                  type="button"
                  onClick={handleCompress}
                  className="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                  Compress PDF Now <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {result && file && (
          <div className="space-y-8 animate-slideDown">
            <div className={`p-8 sm:p-10 rounded-3xl border text-center space-y-6 ${
              darkMode ? 'bg-slate-800/60 border-slate-700 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  Compression Complete
                </span>
                <h2 className={`text-3xl sm:text-4xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Saved {formatFileSize(result.savedBytes)} ({result.savedPercent}% Smaller)
                </h2>
              </div>

              {/* Visual Comparison Bar */}
              <div className="max-w-md mx-auto space-y-3 pt-2">
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Original Size</span>
                    <span>{formatFileSize(result.originalSizeBytes)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Compressed Output</span>
                    <span>{formatFileSize(result.compressedSizeBytes)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(10, 100 - result.savedPercent)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download Compressed PDF
                </button>

                {result.previewOriginalDataUrl && (
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className={`px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    <Eye size={16} /> Compare Quality (Page 1)
                  </button>
                )}

                <button
                  onClick={() => { setResult(null); }}
                  className={`px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw size={14} /> Adjust Settings
                </button>

                <button
                  onClick={() => { setResult(null); setStats(null); setFile(null); }}
                  className={`px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-yellow-500/60 hover:text-yellow-400'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-yellow-400 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} /> Process Another File
                </button>
              </div>
            </div>

            {/* Non-Intrusive Result Screen Sponsored Slot (Far below download button) */}
            <AdSlot placement="RESULT_BOTTOM" />

            {/* Quality Comparison Modal */}
            {showPreviewModal && result.previewOriginalDataUrl && result.previewCompressedDataUrl && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
                <div className={`w-full max-w-4xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 ${
                  darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Side-by-Side Quality Inspection
                      </h3>
                      <p className="text-xs text-slate-400">Page 1 Original vs. Compressed Rendering</p>
                    </div>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold uppercase px-3 py-1.5 rounded-lg bg-slate-800"
                    >
                      Close ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-center">
                      <span className="text-xs font-black text-slate-400 uppercase">
                        Original ({formatFileSize(result.originalSizeBytes)})
                      </span>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden p-2 bg-slate-50 dark:bg-slate-800">
                        <img src={result.previewOriginalDataUrl} alt="Original Preview" className="w-full object-contain rounded-xl max-h-96" />
                      </div>
                    </div>

                    <div className="space-y-2 text-center">
                      <span className="text-xs font-black text-emerald-500 uppercase">
                        Compressed ({formatFileSize(result.compressedSizeBytes)})
                      </span>
                      <div className="border border-emerald-500/40 rounded-2xl overflow-hidden p-2 bg-slate-50 dark:bg-slate-800">
                        <img src={result.previewCompressedDataUrl} alt="Compressed Preview" className="w-full object-contain rounded-xl max-h-96" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 bg-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                    >
                      Download Compressed PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompressTool;
