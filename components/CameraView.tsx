
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraViewProps {
  onCapture: (base64Array: string[]) => void;
  isProcessing: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pendingCapture, setPendingCapture] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera access error:", err);
    }
  }, []);

  const handleToggle = () => {
    if (isExpanded) {
      stopCamera();
      setPendingCapture(null);
    } else {
      startCamera();
    }
    setIsExpanded(!isExpanded);
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPendingCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  const handleConfirm = () => {
    if (pendingCapture) {
      onCapture([pendingCapture]);
      setPendingCapture(null);
    }
  };

  const handleRetake = () => {
    setPendingCapture(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const base64Promises = files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }));

    const results = await Promise.all(base64Promises);
    onCapture(results);
    setIsExpanded(false);
    stopCamera();
    setPendingCapture(null);
  };

  return (
    <div className="relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple
        onChange={handleFileChange} 
      />

      {isExpanded ? (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex-grow relative overflow-hidden">
            {pendingCapture ? (
              <div className="w-full h-full flex flex-col">
                <img src={pendingCapture} className="flex-grow w-full h-full object-contain" alt="Captured" />
                <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6 px-10">
                  <button 
                    onClick={handleRetake}
                    className="flex-1 bg-zinc-900 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
                  >
                    <i className="fas fa-undo mr-2"></i> RETAKE
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className="flex-1 bg-green-600 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-green-900/40"
                  >
                    <i className="fas fa-check mr-2"></i> CONFIRM
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border border-white/20 rounded-2xl"></div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-12 left-0 right-0 flex items-center justify-around px-10">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-full bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
                  >
                    <i className="fas fa-images"></i>
                  </button>

                  <button
                    onClick={capture}
                    disabled={isProcessing}
                    className={`w-24 h-24 rounded-full border-8 border-white flex items-center justify-center transition-all ${
                      isProcessing ? 'bg-zinc-600' : 'bg-red-600 active:scale-90 shadow-2xl'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-white/20"></div>
                  </button>

                  <button 
                    onClick={handleToggle}
                    className="w-14 h-14 rounded-full bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={handleToggle}
          disabled={isProcessing}
          className={`w-full aspect-[2/1] rounded-[2.5rem] flex flex-col items-center justify-center border-4 border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 transition-all active:scale-[0.98] ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-500 mb-2"></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">PROCESSING...</span>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                <i className="fas fa-camera text-2xl text-zinc-400"></i>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">SNAP PRICE TAG</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
