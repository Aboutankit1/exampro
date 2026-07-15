import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiClock, FiZap, FiCheckSquare, FiTrendingUp } from "react-icons/fi";
import StatCard from "../../components/StatCard.jsx";
import api from "../../services/api.js";

const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    api
      .get("/dashboard/student")
      .then(({ data }) => {
        setStats(data.stats);
        setRecentResults(data.recentResults || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming exams" value={stats?.upcomingExams ?? "—"} icon={FiClock} />
        <StatCard label="Live now" value={stats?.liveExams ?? "—"} icon={FiZap} accentColor="text-success" />
        <StatCard label="Completed" value={stats?.completedExams ?? "—"} icon={FiCheckSquare} />
        <StatCard label="Average score" value={stats ? `${stats.avgPercentage}%` : "—"} icon={FiTrendingUp} />
      </div>

      {stats?.liveExams > 0 && (
        <div className="glass-card p-5 border border-success/30 flex items-center justify-between animate-pulseRing">
          <div>
            <p className="text-sm font-medium text-slate-100">You have a live exam waiting</p>
            <p className="text-xs text-muted">Head to My Exams to begin.</p>
          </div>
          <Link to="/exams" className="btn-primary text-sm">View exams</Link>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="font-display text-base font-semibold text-slate-100 mb-4">Recent results</h3>
        {recentResults.length === 0 ? (
          <p className="text-sm text-muted">No exams attempted yet.</p>
        ) : (
          <div className="space-y-3">
            {recentResults.map((r) => (
              <div key={r._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-slate-200">{r.exam?.title || "Exam"}</p>
                  <p className="text-xs text-muted">{r.marksObtained}/{r.totalMarks} marks</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.isPassed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                  {r.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
