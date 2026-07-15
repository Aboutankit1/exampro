import { useEffect, useRef, useState } from "react";
import { FiCamera, FiMaximize, FiAlertTriangle, FiLoader } from "react-icons/fi";

const ExamGate = ({ examTitle, onStart, starting }) => {
  const videoRef = useRef(null);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const streamRef = useRef(null);
  const handedOffRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamReady(true);
      })
      .catch(() => {
        setCameraError("Camera access was denied or is unavailable. It's required to start this exam.");
      });

    return () => {
      cancelled = true;
      // Only stop the tracks if the exam was never actually started with this stream —
      // otherwise this cleanup (which fires the moment ExamTaking swaps this component
      // out) would kill the live camera feed right after handoff.
      if (!handedOffRef.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleStart = () => {
    // Fullscreen must be requested from a direct user gesture — this click is that gesture.
    document.documentElement.requestFullscreen?.().catch(() => {});
    handedOffRef.current = true;
    onStart(streamRef.current);
  };

  return (
    <div className="min-h-screen bg-ink-800 flex items-center justify-center p-6">
      <div className="glass-card max-w-lg w-full p-8 animate-fadeIn">
        <h1 className="font-display text-xl font-semibold text-slate-100 mb-1">{examTitle}</h1>
        <p className="text-sm text-muted mb-6">Before you begin, we need to verify a few things.</p>

        <div className="rounded-xl overflow-hidden bg-ink-900 border border-white/10 mb-4 aspect-video flex items-center justify-center relative">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {!streamReady && !cameraError && (
            <p className="absolute text-xs text-muted flex items-center gap-2"><FiLoader className="animate-spin" /> Requesting camera access...</p>
          )}
          {cameraError && (
            <p className="absolute text-xs text-danger flex items-center gap-2 px-6 text-center"><FiAlertTriangle /> {cameraError}</p>
          )}
        </div>

        <div className="space-y-2.5 text-sm text-slate-300 mb-5">
          <p className="flex items-center gap-2"><FiCamera className="text-accent shrink-0" size={15} /> Your camera stays on for the duration of the exam. If your face isn't visible for too long, it's logged as a violation.</p>
          <p className="flex items-center gap-2"><FiMaximize className="text-accent shrink-0" size={15} /> The exam runs in fullscreen. Exiting fullscreen or switching tabs is logged as a violation.</p>
          <p className="flex items-center gap-2"><FiAlertTriangle className="text-accent shrink-0" size={15} /> After 3 violations, the exam is auto-submitted.</p>
          <p className="text-muted">You can attempt this exam only once — make sure you're ready before starting.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300 mb-5">
          <input type="checkbox" className="accent-accent" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I understand and agree to these exam conditions.
        </label>

        <button
          onClick={handleStart}
          disabled={!streamReady || !agreed || starting}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {starting && <FiLoader className="animate-spin" size={16} />}
          Start exam in fullscreen
        </button>
        {cameraError && <p className="text-xs text-muted text-center mt-3">Allow camera access in your browser's site settings, then reload this page.</p>}
      </div>
    </div>
  );
};

export default ExamGate;
