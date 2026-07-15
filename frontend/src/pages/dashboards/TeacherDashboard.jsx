import { useEffect, useState } from "react";
import { FiHelpCircle, FiFileText } from "react-icons/fi";
import StatCard from "../../components/StatCard.jsx";
import api from "../../services/api.js";

const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    api
      .get("/dashboard/teacher")
      .then(({ data }) => {
        setStats(data.stats);
        setRecentResults(data.recentResults || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Questions authored" value={stats?.totalQuestions ?? "—"} icon={FiHelpCircle} />
        <StatCard label="Exams created" value={stats?.totalExams ?? "—"} icon={FiFileText} />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display text-base font-semibold text-slate-100 mb-4">Recent submissions</h3>
        {recentResults.length === 0 ? (
          <p className="text-sm text-muted">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-white/5">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Percentage</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((r) => (
                  <tr key={r._id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 text-slate-200">{r.student?.name}</td>
                    <td className="py-2.5 text-slate-300">{r.marksObtained}/{r.totalMarks}</td>
                    <td className="py-2.5 text-slate-300">{r.percentage}%</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.isPassed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                        {r.isPassed ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
