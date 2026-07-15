import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAward } from "react-icons/fi";
import api from "../services/api.js";

const Results = () => {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    api.get("/attempts/my").then(({ data }) => setAttempts(data.attempts));
  }, []);

  const evaluated = attempts.filter((a) => a.status === "evaluated");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{evaluated.length} completed exam(s)</p>
      <div className="glass-card divide-y divide-white/5">
        {evaluated.length === 0 ? (
          <p className="p-6 text-sm text-muted">No results yet. Complete an exam to see it here.</p>
        ) : (
          evaluated.map((a) => (
            <div key={a._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <FiAward size={16} />
                </div>
                <div>
                  <p className="text-sm text-slate-200">{a.exam?.title}</p>
                  <p className="text-xs text-muted">Submitted {new Date(a.submittedAt).toLocaleString()}</p>
                </div>
              </div>
              <Link to={`/exam-result/${a._id}`} className="btn-secondary text-sm">View result</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Results;
