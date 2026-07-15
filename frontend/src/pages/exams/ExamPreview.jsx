import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiEye } from "react-icons/fi";
import api from "../../services/api.js";

const ExamPreview = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/exams/${examId}`)
      .then(({ data }) => setExam(data.exam))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-800 flex items-center justify-center">
        <p className="text-muted text-sm">Loading preview...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-ink-800 flex items-center justify-center">
        <p className="text-muted text-sm">Exam not found.</p>
      </div>
    );
  }

  const questions = exam.questions || [];
  const q = questions[currentIndex];

  return (
    <div className="min-h-screen bg-ink-800 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-ink-700/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/exams")} className="w-9 h-9 rounded-lg bg-ink-600/60 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-ink-500/60">
            <FiArrowLeft size={15} />
          </button>
          <div>
            <h1 className="font-display font-semibold text-slate-100">{exam.title}</h1>
            <p className="text-xs text-muted">Question {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-accent/15 text-accent">
          <FiEye size={13} /> Preview mode — correct answers shown, nothing is saved
        </span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          {questions.length === 0 ? (
            <p className="text-sm text-muted">This exam has no questions.</p>
          ) : (
            <div className="glass-card p-6 max-w-3xl">
              <div className="flex items-center gap-2 mb-4 text-xs">
                <span className="px-2 py-0.5 rounded bg-ink-600/60 text-muted uppercase font-mono">{q.type.replace("_", " ")}</span>
                <span className="text-muted">{q.marks} marks{exam.negativeMarking ? ` · -${q.negativeMarks} if wrong` : ""}</span>
                <span className="text-muted capitalize">· {q.difficulty}</span>
              </div>
              <p className="text-slate-100 text-base leading-relaxed mb-6">{q.questionText}</p>

              {(q.type === "mcq" || q.type === "multi_correct" || q.type === "true_false") && (
                <div className="space-y-3 mb-4">
                  {q.options.map((opt) => (
                    <div
                      key={opt._id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                        opt.isCorrect ? "border-success bg-success/10" : "border-white/10"
                      }`}
                    >
                      <span className="text-sm text-slate-200">{opt.text}</span>
                      {opt.isCorrect && <FiCheckCircle className="text-success shrink-0" size={16} />}
                    </div>
                  ))}
                </div>
              )}

              {q.type === "numerical" && (
                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className="text-muted">Correct answer:</span>
                  <span className="text-success font-mono">{q.correctNumericAnswer}</span>
                  {q.numericTolerance ? <span className="text-muted">(± {q.numericTolerance})</span> : null}
                </div>
              )}

              {q.type === "fill_blank" && (
                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className="text-muted">Correct answer:</span>
                  <span className="text-success font-mono">{q.correctTextAnswer}</span>
                </div>
              )}

              {q.type === "descriptive" && (
                <p className="text-xs text-muted mb-4">Descriptive question — graded manually after submission, no fixed answer key.</p>
              )}

              {q.explanation && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-muted mb-1">Explanation</p>
                  <p className="text-sm text-slate-300">{q.explanation}</p>
                </div>
              )}
            </div>
          )}

          <div className="max-w-3xl flex justify-between mt-5">
            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)} className="btn-secondary text-sm disabled:opacity-40">
              Previous
            </button>
            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="btn-primary text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <aside className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-ink-700/40 p-5 overflow-y-auto">
          <p className="text-xs text-muted mb-3">Jump to question</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition-colors ${
                  idx === currentIndex ? "bg-accent text-ink-900" : "bg-ink-600/60 text-slate-300 hover:bg-ink-500/60"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExamPreview;
