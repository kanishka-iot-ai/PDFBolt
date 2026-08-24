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

        const onBeginRef = useRef(onBegin);
        const onEndRef = useRef(onEnd);
        useEffect(() => {
            onBeginRef.current = onBegin;
            onEndRef.current = onEnd;
        }, [onBegin, onEnd]);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Resize for high DPI screens (retina support)
            const resizeCanvas = () => {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const width = canvas.offsetWidth || 500;
                const height = canvas.offsetHeight || 200;
                canvas.width = width * ratio;
                canvas.height = height * ratio;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(ratio, ratio);

                    // Apply background color
                    if (currentBgColor && currentBgColor !== "rgba(255,255,255,0)") {
                        ctx.fillStyle = currentBgColor;
                        ctx.fillRect(0, 0, width, height);
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

            const widthConfig = STROKE_WIDTHS[strokeWidth];
            const previousData = sigPadRef.current?.toData();

            // Initialize signature pad with smooth rendering settings
            sigPadRef.current = new SignaturePad(canvas, {
                minWidth: widthConfig.min,
                maxWidth: widthConfig.max,
                penColor: penColor,
                backgroundColor: currentBgColor,
                throttle: 16,
                velocityFilterWeight: 0.7,
                minDistance: 5,
            });

            if (previousData && previousData.length > 0) {
                sigPadRef.current.fromData(previousData);
            }

            // Event listeners with stable refs
            const handleBegin = () => onBeginRef.current?.();
            const handleEnd = () => onEndRef.current?.();

            sigPadRef.current.addEventListener("beginStroke", handleBegin);
            sigPadRef.current.addEventListener("endStroke", handleEnd);

            return () => {
                window.removeEventListener("resize", resizeCanvas);
                if (sigPadRef.current) {
                    sigPadRef.current.off();
                }
            };
        }, [strokeWidth, penColor, currentBgColor]);

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

        useImperativeHandle(ref, () => ({
            clear: () => {
                sigPadRef.current?.clear();
            },
            undo: () => {
                const data = sigPadRef.current?.toData();
                if (data && data.length > 0) {
                    data.pop(); // Remove the last stroke
                    sigPadRef.current?.fromData(data);
                }
            },
            isEmpty: () => {
                return sigPadRef.current?.isEmpty() ?? true;
            },
            toDataURL: (type = "image/png", bgColor?: string) => {
                const canvas = canvasRef.current;
                if (!canvas) return "";

                const exportBgColor = bgColor || currentBgColor;
                if (exportBgColor && exportBgColor !== "rgba(255,255,255,0)") {
                    const tempCanvas = document.createElement("canvas");
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const ctx = tempCanvas.getContext("2d");
                    if (ctx) {
                        ctx.fillStyle = exportBgColor;
                        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                        ctx.drawImage(canvas, 0, 0);
                        return tempCanvas.toDataURL(type);
                    }
                }
                return canvas.toDataURL(type);
            },
            toBlob: (bgColor?: string): Promise<Blob | null> => {
                return new Promise((resolve) => {
                    const canvas = canvasRef.current;
                    if (!canvas) {
                        resolve(null);
                        return;
                    }

                    const exportBgColor = bgColor || currentBgColor;
                    if (exportBgColor && exportBgColor !== "rgba(255,255,255,0)") {
                        const tempCanvas = document.createElement("canvas");
                        tempCanvas.width = canvas.width;
                        tempCanvas.height = canvas.height;
                        const ctx = tempCanvas.getContext("2d");
                        if (ctx) {
                            ctx.fillStyle = exportBgColor;
                            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                            ctx.drawImage(canvas, 0, 0);
                            tempCanvas.toBlob(resolve, "image/png");
                            return;
                        }
                    }
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
                        const data = sigPadRef.current?.toData();
                        ctx.fillStyle = color;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
                style={{ touchAction: "none" }}
                aria-label="Signature drawing canvas"
                className={`w-full h-48 cursor-crosshair touch-none ${className}`}
            />
        );
    }
);

SignatureCanvas.displayName = "SignatureCanvas";

export default SignatureCanvas;
