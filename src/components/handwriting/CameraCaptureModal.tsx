import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Sun, Eye, FlipHorizontal } from 'lucide-react';
import { soundEngine } from '../../utils/sounds';
import { assessImageQuality } from '../../services/handwritingService';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  pageNumber: number;
  darkMode: boolean;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  pageNumber,
  darkMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedPreview(null);
    setQualityWarning(null);

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access was denied or unavailable. Please ensure permissions are granted.");
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Toggle Camera Front/Back
  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture Image
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    soundEngine.playShutter();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Assess quality
    const assessment = assessImageQuality(canvas);
    if (assessment.isLowQuality) {
      setQualityWarning(assessment.reason || "Image quality appears low. Retake recommended for better handwriting OCR.");
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(dataUrl);
    setIsCapturing(false);
  };

  // Confirm photo and add to page queue
  const handleAcceptPhoto = () => {
    if (!capturedPreview) return;
    stopCamera();
    onCapture(capturedPreview);
    onClose();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPreview(null);
    setQualityWarning(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[92vh] ${
        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-black text-base">Capture Page {pageNumber}</h3>
              <p className="text-xs text-slate-400 font-medium">Position document flat inside frame</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport / Captured Preview */}
        <div className="relative flex-grow min-h-[360px] sm:min-h-[440px] bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-8 text-center max-w-md">
              <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-4" />
              <h4 className="font-bold text-white text-lg mb-2">Camera Unavailable</h4>
              <p className="text-sm text-slate-300 mb-6">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 bg-yellow-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-yellow-400 transition-all"
              >
                Retry Access
              </button>
            </div>
          ) : capturedPreview ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPreview}
                alt="Captured Page"
                className="max-h-[440px] w-auto object-contain rounded-lg"
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Document Alignment Frame */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-yellow-400/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-yellow-400"></div>
                  <div className="w-6 h-6 border-t-4 border-r-4 border-yellow-400"></div>
                </div>
                <div className="text-center">
                  <span className="bg-black/60 backdrop-blur-sm text-yellow-300 font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full">
                    Align Page Here
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-yellow-400"></div>
                  <div className="w-6 h-6 border-b-4 border-r-4 border-yellow-400"></div>
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Quality Advice or Warning Banner */}
        {qualityWarning && capturedPreview && (
          <div className="px-6 py-3 bg-amber-500/15 border-t border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{qualityWarning}</span>
          </div>
        )}

        {!capturedPreview && !cameraError && (
          <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-6 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Sun size={13} className="text-yellow-500" /> Good Lighting</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Eye size={13} className="text-blue-500" /> Sharp Focus</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Sparkles size={13} className="text-emerald-500" /> Parallel Angle</span>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          {capturedPreview ? (
            <>
              <button
                onClick={handleRetake}
                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} /> Retake
              </button>
              <button
                onClick={handleAcceptPhoto}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <CheckCircle2 size={18} /> Use Photo (Add to Queue)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleFacingMode}
                className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all flex items-center gap-2 text-xs font-bold"
                title="Switch Front/Back Camera"
              >
                <FlipHorizontal size={18} /> Switch Camera
              </button>

              <button
                onClick={handleSnap}
                aria-label="Take photograph"
                disabled={isCapturing || !!cameraError}
                className="w-16 h-16 rounded-full bg-yellow-500 hover:bg-yellow-400 p-1.5 shadow-xl transition-all transform active:scale-90 flex items-center justify-center ring-4 ring-yellow-500/30"
              >
                <div className="w-full h-full rounded-full border-2 border-slate-950 bg-white"></div>
              </button>

              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
