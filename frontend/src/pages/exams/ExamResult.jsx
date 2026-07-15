import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiMinusCircle, FiAward } from "react-icons/fi";
import api from "../../services/api.js";

const ExamResult = () => {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    api.get(`/attempts/${attemptId}/result`).then(({ data }) => setResult(data.result));
  }, [attemptId]);

  const loadAnalysis = async () => {
    const { data } = await api.get(`/attempts/${attemptId}/analysis`);
    setAnalysis(data.analysis);
    setShowAnalysis(true);
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-ink-800 flex items-center justify-center">
        <p className="text-muted text-sm">Loading result...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-800 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6 animate-fadeIn">
        <div className="glass-card p-8 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${result.isPassed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
            <FiAward size={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-100 mb-1">
            {result.isPassed ? "Congratulations, you passed!" : "Exam submitted"}
          </h1>
          <p className="text-muted text-sm mb-6">{result.exam?.title}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-3xl font-display font-semibold text-accent">{result.marksObtained}</p>
              <p className="text-xs text-muted">/ {result.totalMarks} marks</p>
            </div>
            <div>
              <p className="text-3xl font-display font-semibold text-slate-100">{result.percentage}%</p>
              <p className="text-xs text-muted">percentage</p>
            </div>
            <div>
              <p className={`text-3xl font-display font-semibold ${result.isPassed ? "text-success" : "text-danger"}`}>
                {result.isPassed ? "PASS" : "FAIL"}
              </p>
              <p className="text-xs text-muted">Passing: {result.passingMarks}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mb-6">
            <div className="glass-card p-3 flex flex-col items-center gap-1">
              <FiCheckCircle className="text-success" />
              <span>{result.correctCount} correct</span>
            </div>
            <div className="glass-card p-3 flex flex-col items-center gap-1">
              <FiXCircle className="text-danger" />
              <span>{result.wrongCount} wrong</span>
            </div>
            <div className="glass-card p-3 flex flex-col items-center gap-1">
              <FiMinusCircle className="text-muted" />
              <span>{result.unansweredCount} skipped</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={loadAnalysis} className="btn-secondary flex-1">View question analysis</button>
            <Link to="/dashboard" className="btn-primary flex-1 text-center">Back to dashboard</Link>
          </div>
        </div>

        {showAnalysis && analysis && (
          <div className="glass-card p-6 space-y-4 animate-fadeIn">
            <h3 className="font-display font-semibold text-slate-100">Question analysis</h3>
            {analysis.map((a, idx) => (
              <div key={idx} className="border-b border-white/5 pb-4 last:border-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm text-slate-200">{idx + 1}. {a.question}</p>
                  {a.isCorrect === true && <FiCheckCircle className="text-success shrink-0" />}
                  {a.isCorrect === false && <FiXCircle className="text-danger shrink-0" />}
                  {a.isCorrect === null && <FiMinusCircle className="text-muted shrink-0" />}
                </div>
                {a.explanation && <p className="text-xs text-muted mt-1">Explanation: {a.explanation}</p>}
                <p className="text-xs text-muted mt-1">Marks awarded: {a.marksAwarded}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResult;
