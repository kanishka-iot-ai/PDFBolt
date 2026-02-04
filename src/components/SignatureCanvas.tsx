import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import SignaturePad from "signature_pad";

export interface SignatureCanvasRef {
    clear: () => void;
    undo: () => void;
    isEmpty: () => boolean;
    toDataURL: (type?: string, backgroundColor?: string) => string;
    toBlob: (backgroundColor?: string) => Promise<Blob | null>;
    setPenColor: (color: string) => void;
    setStrokeWidth: (min: number, max: number) => void;
    setBackgroundColor: (color: string) => void;
    fromDataURL: (dataUrl: string) => void;
    getData: () => any;
    setData: (data: any) => void;
}

interface SignatureCanvasProps {
    darkMode?: boolean;
    penColor?: string;
    strokeWidth?: 'thin' | 'medium' | 'thick';
    backgroundColor?: string;
    className?: string;
    onBegin?: () => void;
    onEnd?: () => void;
}

const STROKE_WIDTHS = {
    thin: { min: 0.5, max: 1.5 },
    medium: { min: 1, max: 2.5 },
    thick: { min: 2, max: 4 },
};

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
    ({
        darkMode = false,
        penColor = "#000",
        strokeWidth = 'medium',
        backgroundColor = "rgba(255,255,255,0)",
        className = "",
        onBegin,
        onEnd,
    }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const sigPadRef = useRef<SignaturePad | null>(null);
        const [currentBgColor, setCurrentBgColor] = useState(backgroundColor);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Resize for high DPI screens (retina support)
            const resizeCanvas = () => {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(ratio, ratio);

                    // Apply background color
                    if (currentBgColor && currentBgColor !== "rgba(255,255,255,0)") {
                        ctx.fillStyle = currentBgColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                }

                // Redraw existing signature after resize
                if (sigPadRef.current) {
                    const data = sigPadRef.current.toData();
                    if (data.length > 0) {
                        sigPadRef.current.fromData(data);
                    }
                }
            };

            resizeCanvas();
            window.addEventListener("resize", resizeCanvas);

            const width = STROKE_WIDTHS[strokeWidth];

            // Initialize signature pad with world-class settings
            sigPadRef.current = new SignaturePad(canvas, {
                minWidth: width.min,
                maxWidth: width.max,
                penColor: penColor,
                backgroundColor: currentBgColor,
                throttle: 16, // 60fps for smooth rendering
                velocityFilterWeight: 0.7,
                minDistance: 5,
            });

            // Add event listeners
            if (onBegin) {
                sigPadRef.current.addEventListener("beginStroke", onBegin);
            }
            if (onEnd) {
                sigPadRef.current.addEventListener("endStroke", onEnd);
            }

            return () => {
                window.removeEventListener("resize", resizeCanvas);
                if (sigPadRef.current) {
                    sigPadRef.current.off();
                }
            };
        }, []);

        // Update pen color when prop changes
        useEffect(() => {
            if (sigPadRef.current) {
                sigPadRef.current.penColor = penColor;
            }
        }, [penColor]);

        // Update stroke width when prop changes
        useEffect(() => {
            if (sigPadRef.current) {
                const width = STROKE_WIDTHS[strokeWidth];
                sigPadRef.current.minWidth = width.min;
                sigPadRef.current.maxWidth = width.max;
            }
        }, [strokeWidth]);

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            clear: () => {
                sigPadRef.current?.clear();
                // Reapply background after clearing
                const canvas = canvasRef.current;
                if (canvas && currentBgColor && currentBgColor !== "rgba(255,255,255,0)") {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.fillStyle = currentBgColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                }
            },
            undo: () => {
                const data = sigPadRef.current?.toData();
                if (data && data.length > 0) {
                    data.pop();
                    sigPadRef.current?.fromData(data);
                }
            },
            isEmpty: () => {
                return sigPadRef.current?.isEmpty() ?? true;
            },
            toDataURL: (type = "image/png", bgColor?: string) => {
                if (!sigPadRef.current) return "";

                // If background color is specified, temporarily apply it
                if (bgColor) {
                    const originalBg = sigPadRef.current.backgroundColor;
                    sigPadRef.current.backgroundColor = bgColor;
                    const dataUrl = sigPadRef.current.toDataURL(type);
                    sigPadRef.current.backgroundColor = originalBg;
                    return dataUrl;
                }

                return sigPadRef.current.toDataURL(type);
            },
            toBlob: async (bgColor?: string) => {
                const canvas = canvasRef.current;
                if (!canvas) return null;

                // If background color specified, create a new canvas with background
                if (bgColor && bgColor !== "rgba(255,255,255,0)") {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const ctx = tempCanvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                        ctx.drawImage(canvas, 0, 0);
                        return new Promise<Blob | null>((resolve) => {
                            tempCanvas.toBlob(resolve, "image/png");
                        });
                    }
                }

                return new Promise<Blob | null>((resolve) => {
                    canvas.toBlob(resolve, "image/png");
                });
            },
            setPenColor: (color: string) => {
                if (sigPadRef.current) {
                    sigPadRef.current.penColor = color;
                }
            },
            setStrokeWidth: (min: number, max: number) => {
                if (sigPadRef.current) {
                    sigPadRef.current.minWidth = min;
                    sigPadRef.current.maxWidth = max;
                }
            },
            setBackgroundColor: (color: string) => {
                setCurrentBgColor(color);
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        // Save current signature
                        const data = sigPadRef.current?.toData();

                        // Clear and apply new background
                        ctx.fillStyle = color;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Restore signature
                        if (data && data.length > 0) {
                            sigPadRef.current?.fromData(data);
                        }
                    }
                }
                if (sigPadRef.current) {
                    sigPadRef.current.backgroundColor = color;
                }
            },
            fromDataURL: (dataUrl: string) => {
                sigPadRef.current?.fromDataURL(dataUrl);
            },
            getData: () => {
                return sigPadRef.current?.toData() ?? [];
            },
            setData: (data: any) => {
                sigPadRef.current?.fromData(data);
            },
        }));

        return (
            <canvas
                ref={canvasRef}
                width={500}
                height={200}
                style={{ touchAction: "none" }}
                className={`w-full h-48 cursor-crosshair touch-none ${className}`}
            />
        );
    }
);

SignatureCanvas.displayName = "SignatureCanvas";

export default SignatureCanvas;
