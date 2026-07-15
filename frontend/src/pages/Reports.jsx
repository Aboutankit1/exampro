import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import api from "../services/api.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const Reports = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get("/exams").then(({ data }) => setExams(data.exams));
  }, []);

  useEffect(() => {
    if (!selectedExam) return setAnalytics(null);
    api.get(`/dashboard/exam-analytics/${selectedExam}`).then(({ data }) => setAnalytics(data));
  }, [selectedExam]);

  const chartData = analytics && {
    labels: Object.keys(analytics.scoreDistribution),
    datasets: [
      {
        data: Object.values(analytics.scoreDistribution),
        backgroundColor: ["#F16063", "#F4C374", "#E8A33D", "#34D399"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-5">
      <select className="input-field w-auto" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
        <option value="">Select an exam to view analytics</option>
        {exams.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
      </select>

      {analytics && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-slate-100 mb-4">Score distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#8B93AC" } } } }} />
            </div>
          </div>
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-slate-100">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted text-xs">Total attempts</p><p className="text-xl font-semibold text-slate-100">{analytics.totalAttempts}</p></div>
              <div><p className="text-muted text-xs">Pass %</p><p className="text-xl font-semibold text-success">{analytics.passPercentage}%</p></div>
              <div><p className="text-muted text-xs">Passed</p><p className="text-xl font-semibold text-slate-100">{analytics.passed}</p></div>
              <div><p className="text-muted text-xs">Failed</p><p className="text-xl font-semibold text-danger">{analytics.failed}</p></div>
            </div>
          </div>
        </div>
      )}

      {!analytics && (
        <div className="glass-card p-6">
          <p className="text-sm text-muted">
            Select an exam above to view its pass rate and score distribution. PDF/Excel report export isn't
            wired up in this build — the data returned here is ready to be piped into a report generator.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;
