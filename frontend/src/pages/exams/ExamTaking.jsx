import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiCamera } from "react-icons/fi";
import {
  startExamAttempt,
  submitExamAttempt,
  setCurrentIndex,
  updateLocalAnswer,
  tickTimer,
  incrementViolation,
  resetExamState,
} from "../../redux/slices/examSlice.js";
import api from "../../services/api.js";
import ExamGate from "./ExamGate.jsx";

const STATUS_META = {
  answered: { color: "bg-success", label: "Answered" },
  not_answered: { color: "bg-danger", label: "Not answered" },
  marked_review: { color: "bg-warning", label: "Marked for review" },
  answered_marked_review: { color: "bg-warning", label: "Answered & marked" },
  not_visited: { color: "bg-ink-500", label: "Not visited" },
};

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

// Grabs a small, low-quality JPEG frame from a live video element — kept tiny
// on purpose since these get stored as base64 in the attempt document.
const captureFrame = (videoEl) => {
  if (!videoEl || videoEl.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.5);
};

const ExamTaking = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [gateComplete, setGateComplete] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [outOfFullscreen, setOutOfFullscreen] = useState(false);
  const [faceVisible, setFaceVisible] = useState(true);

  const { attemptId, exam, questions, answers, currentIndex, remainingSeconds, violationCount, loading, error } =
    useSelector((state) => state.exam);

  useEffect(() => {
    return () => {
      dispatch(resetExamState());
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // ---- Gate: camera permission + fullscreen start (user-gesture driven) ----
  const handleGateStart = async (stream) => {
    streamRef.current = stream;
    setStarting(true);
    const result = await dispatch(startExamAttempt({ examId, cameraConsent: true }));
    setStarting(false);
    if (startExamAttempt.fulfilled.match(result)) {
      setGateComplete(true);
    } else {
      toast.error(result.payload || "Could not start exam");
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  };

  // attach the live stream to the in-exam preview element once it mounts
  useEffect(() => {
    if (gateComplete && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [gateComplete]);

  // snapshot on exam start
  useEffect(() => {
    if (!gateComplete || !attemptId) return;
    const t = setTimeout(() => {
      const img = captureFrame(videoRef.current);
      if (img) api.post(`/attempts/${attemptId}/snapshot`, { image: img, trigger: "exam_start" }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [gateComplete, attemptId]);

  // ---- Countdown timer ----
  useEffect(() => {
    if (!attemptId) return;
    const interval = setInterval(() => dispatch(tickTimer()), 1000);
    return () => clearInterval(interval);
  }, [attemptId, dispatch]);

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (!attemptId) return;
      const result = await dispatch(submitExamAttempt({ attemptId, autoSubmitted }));
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (submitExamAttempt.fulfilled.match(result)) {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        navigate(`/exam-result/${attemptId}`);
      } else {
        toast.error(result.payload || "Submit failed");
      }
    },
    [attemptId, dispatch, navigate]
  );

  useEffect(() => {
    if (attemptId && gateComplete && remainingSeconds === 0) {
      toast("Time's up! Auto-submitting...", { icon: "⏰" });
      handleSubmit(true);
    }
  }, [remainingSeconds, attemptId, gateComplete, handleSubmit]);

  // ---- Anti-cheating: fullscreen, tab switch, right click, copy/paste ----
  const logViolation = useCallback(
    async (type) => {
      if (!attemptId) return;
      dispatch(incrementViolation());
      const img = captureFrame(videoRef.current);
      if (img) api.post(`/attempts/${attemptId}/snapshot`, { image: img, trigger: "violation" }).catch(() => {});
      try {
        const { data } = await api.post(`/attempts/${attemptId}/violation`, { type });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 4000);
        if (data.shouldAutoSubmit) {
          toast.error("Too many violations detected. Submitting exam automatically.");
          handleSubmit(true);
        }
      } catch {
        /* non-critical */
      }
    },
    [attemptId, dispatch, handleSubmit]
  );

  // ---- Face-presence detection: flags the student looking away from camera for an
  // extended period (e.g. checking a phone off-screen). Runs entirely in the browser —
  // no images are sent anywhere for this check, only the pass/fail result. ----
  useEffect(() => {
    if (!gateComplete || !attemptId) return;
    let cancelled = false;
    let intervalId = null;
    let consecutiveMisses = 0;
    let episodeFlagged = false;
    const MISS_THRESHOLD = 2; // ~2 checks * 5s interval = ~10s of no face before flagging

    import("face-api.js").then(async (faceapi) => {
      if (cancelled) return;
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      } catch {
        return; // model failed to load — skip this feature gracefully, rest of the exam still works
      }
      if (cancelled) return;

      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const detection = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
          );
          if (detection) {
            consecutiveMisses = 0;
            episodeFlagged = false;
            setFaceVisible(true);
          } else {
            consecutiveMisses += 1;
            setFaceVisible(false);
            if (consecutiveMisses >= MISS_THRESHOLD && !episodeFlagged) {
              episodeFlagged = true;
              logViolation("no_face_detected");
            }
          }
        } catch {
          /* skip this tick */
        }
      }, 5000);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [gateComplete, attemptId, logViolation]);

  useEffect(() => {
    if (!gateComplete) return;

    const onVisibility = () => {
      if (document.hidden) logViolation("tab_switch");
    };
    const onBlur = () => logViolation("window_blur");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setOutOfFullscreen(true);
        logViolation("fullscreen_exit");
      } else {
        setOutOfFullscreen(false);
      }
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      logViolation("right_click");
    };
    const onCopyPaste = (e) => {
      e.preventDefault();
      logViolation("copy_paste");
    };
    const onKeyDown = (e) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key))) {
        e.preventDefault();
        logViolation("devtools");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [gateComplete, logViolation]);

  const resumeFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!gateComplete) {
    return <ExamGate examTitle={exam?.title || "Loading exam..."} onStart={handleGateStart} starting={starting || loading} />;
  }

  if (loading || !exam || !questions.length) {
    return (
      <div className="min-h-screen bg-ink-800 flex items-center justify-center">
        <p className="text-muted text-sm">Loading exam...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?._id] || {};

  const hasResponse = (a) =>
    (a.selectedOptions && a.selectedOptions.length > 0) ||
    (a.numericAnswer !== undefined && a.numericAnswer !== null && a.numericAnswer !== "") ||
    (a.textAnswer && a.textAnswer.trim().length > 0);

  // Persists whatever is currently filled in for a question, computing the right
  // palette color (answered/not_answered, preserving a "marked for review" flag if set)
  // instead of assuming the question was left blank just because Save & Next wasn't clicked.
  const persistAnswer = async (question, answer, forcedStatus) => {
    if (!question) return;
    const status =
      forcedStatus ||
      (answer.status === "marked_review" || answer.status === "answered_marked_review"
        ? hasResponse(answer)
          ? "answered_marked_review"
          : "marked_review"
        : hasResponse(answer)
        ? "answered"
        : "not_answered");

    const payload = {
      questionId: question._id,
      selectedOptions: answer.selectedOptions,
      numericAnswer: answer.numericAnswer,
      textAnswer: answer.textAnswer,
      status,
    };
    dispatch(updateLocalAnswer(payload));
    try {
      await api.put(`/attempts/${attemptId}/answer`, payload);
    } catch {
      /* auto-save best-effort */
    }
  };

  const saveAndAdvance = async (forcedStatus) => {
    await persistAnswer(currentQuestion, currentAnswer, forcedStatus);
    if (currentIndex < questions.length - 1) dispatch(setCurrentIndex(currentIndex + 1));
  };

  // Used by Previous and by clicking a palette number directly — always saves
  // whatever answer is currently on screen before switching questions.
  const goTo = async (idx) => {
    if (idx === currentIndex) return;
    await persistAnswer(currentQuestion, currentAnswer);
    dispatch(setCurrentIndex(idx));
  };

  const handleOptionSelect = (optionId, multi) => {
    let selected = currentAnswer.selectedOptions || [];
    if (multi) {
      selected = selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
    } else {
      selected = [optionId];
    }
    dispatch(updateLocalAnswer({ questionId: currentQuestion._id, selectedOptions: selected }));
  };

  const summary = Object.values(answers).reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="min-h-screen bg-ink-800 flex flex-col select-none">
      {/* Forced fullscreen re-entry overlay — blocks interaction until resumed */}
      {outOfFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card p-8 max-w-sm text-center animate-fadeIn">
            <FiAlertTriangle className="text-danger mx-auto mb-3" size={28} />
            <h3 className="font-display text-lg font-semibold text-slate-100 mb-2">You left the exam window</h3>
            <p className="text-sm text-muted mb-5">
              This has been logged as a violation ({violationCount}/3). The exam auto-submits at 3 violations.
              Click below to return to fullscreen and continue.
            </p>
            <button onClick={resumeFullscreen} className="btn-primary w-full">Resume exam in fullscreen</button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-ink-700/60 backdrop-blur-md">
        <div>
          <h1 className="font-display font-semibold text-slate-100">{exam.title}</h1>
          <p className="text-xs text-muted">Question {currentIndex + 1} of {questions.length}</p>
        </div>

        <div className="flex items-center gap-4">
          {violationCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <FiAlertTriangle size={13} /> {violationCount}/3 violations
            </span>
          )}
          <div className={`font-mono text-lg px-4 py-1.5 rounded-lg border ${remainingSeconds < 60 ? "border-danger text-danger animate-pulse" : "border-accent/40 text-accent"}`}>
            {formatTime(remainingSeconds)}
          </div>
        </div>
      </header>

      {showViolationWarning && (
        <div className="bg-danger/15 border-b border-danger/30 text-danger text-sm px-6 py-2 flex items-center gap-2 animate-fadeIn">
          <FiAlertTriangle size={14} /> Activity outside the exam window was detected and logged.
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Question panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="glass-card p-6 max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-xs">
              <span className="px-2 py-0.5 rounded bg-ink-600/60 text-muted uppercase font-mono">{currentQuestion?.type.replace("_", " ")}</span>
              <span className="text-muted">{currentQuestion?.marks} marks{exam.negativeMarking ? ` · -${currentQuestion?.negativeMarks} if wrong` : ""}</span>
            </div>
            <p className="text-slate-100 text-base leading-relaxed mb-6">{currentQuestion?.questionText}</p>

            {(currentQuestion?.type === "mcq" || currentQuestion?.type === "true_false") && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => (
                  <label key={opt._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${currentAnswer.selectedOptions?.[0] === opt._id ? "border-accent bg-accent/10" : "border-white/10 hover:border-white/20"}`}>
                    <input type="radio" name="option" className="accent-accent" checked={currentAnswer.selectedOptions?.[0] === opt._id || false} onChange={() => handleOptionSelect(opt._id, false)} />
                    <span className="text-sm text-slate-200">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion?.type === "multi_correct" && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => (
                  <label key={opt._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${currentAnswer.selectedOptions?.includes(opt._id) ? "border-accent bg-accent/10" : "border-white/10 hover:border-white/20"}`}>
                    <input type="checkbox" className="accent-accent" checked={currentAnswer.selectedOptions?.includes(opt._id) || false} onChange={() => handleOptionSelect(opt._id, true)} />
                    <span className="text-sm text-slate-200">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion?.type === "numerical" && (
              <input
                type="number"
                className="input-field max-w-xs"
                placeholder="Enter numeric answer"
                value={currentAnswer.numericAnswer ?? ""}
                onChange={(e) => dispatch(updateLocalAnswer({ questionId: currentQuestion._id, numericAnswer: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            )}

            {currentQuestion?.type === "fill_blank" && (
              <input
                type="text"
                className="input-field max-w-md"
                placeholder="Type your answer"
                value={currentAnswer.textAnswer ?? ""}
                onChange={(e) => dispatch(updateLocalAnswer({ questionId: currentQuestion._id, textAnswer: e.target.value }))}
              />
            )}

            {currentQuestion?.type === "descriptive" && (
              <textarea
                rows={6}
                className="input-field"
                placeholder="Write your answer here..."
                value={currentAnswer.textAnswer ?? ""}
                onChange={(e) => dispatch(updateLocalAnswer({ questionId: currentQuestion._id, textAnswer: e.target.value }))}
              />
            )}
          </div>

          {/* Bottom action bar */}
          <div className="max-w-3xl flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => persistAnswer(currentQuestion, { selectedOptions: [], numericAnswer: "", textAnswer: "" }, "not_answered")}
              className="btn-secondary text-sm"
            >
              Clear response
            </button>
            <button
              onClick={() => saveAndAdvance(hasResponse(currentAnswer) ? "answered_marked_review" : "marked_review")}
              className="btn-secondary text-sm"
            >
              Mark for review & next
            </button>
            <div className="flex-1" />
            <button disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)} className="btn-secondary text-sm disabled:opacity-40">
              Previous
            </button>
            <button
              onClick={() => saveAndAdvance(hasResponse(currentAnswer) ? "answered" : "not_answered")}
              className="btn-primary text-sm"
            >
              Save & Next
            </button>
          </div>
        </div>

        {/* Palette sidebar */}
        <aside className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-ink-700/40 p-5 overflow-y-auto">
          {/* Live camera preview — proctoring */}
          <div className="rounded-lg overflow-hidden border border-white/10 mb-4 aspect-video bg-ink-900 relative">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[10px] bg-black/60 text-danger px-1.5 py-0.5 rounded">
              <FiCamera size={10} /> REC
            </span>
            <span className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${faceVisible ? "bg-black/60 text-success" : "bg-danger/80 text-white animate-pulse"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${faceVisible ? "bg-success" : "bg-white"}`} />
              {faceVisible ? "Face detected" : "Face not visible"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted mb-4">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`status-dot ${meta.color}`} />
                {meta.label} ({summary[key] || 0})
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {questions.map((q, idx) => {
              const status = answers[q._id]?.status || "not_visited";
              return (
                <button
                  key={q._id}
                  onClick={() => goTo(idx)}
                  className={`w-9 h-9 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition-transform hover:scale-105 ${STATUS_META[status].color} ${idx === currentIndex ? "ring-2 ring-white" : ""} text-ink-800`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button onClick={() => setShowSubmitConfirm(true)} className="btn-primary w-full">
            Submit exam
          </button>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full animate-fadeIn">
            <h3 className="font-display text-lg font-semibold text-slate-100 mb-2">Submit exam?</h3>
            <p className="text-sm text-muted mb-4">
              {summary.not_answered || 0} question(s) are unanswered. Once submitted, you cannot make further changes or retake this exam.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="btn-secondary flex-1">Keep reviewing</button>
              <button onClick={() => handleSubmit(false)} className="btn-primary flex-1">Submit now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamTaking;
