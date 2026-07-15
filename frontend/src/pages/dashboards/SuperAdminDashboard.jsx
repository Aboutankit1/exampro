import { useEffect, useState } from "react";
import { FiHome, FiUsers, FiFileText, FiHelpCircle, FiActivity } from "react-icons/fi";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import StatCard from "../../components/StatCard.jsx";
import api from "../../services/api.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyExams, setMonthlyExams] = useState([]);

  useEffect(() => {
    api
      .get("/dashboard/superadmin")
      .then(({ data }) => {
        setStats(data.stats);
        setMonthlyExams(data.monthlyExams || []);
      })
      .catch(() => {});
  }, []);

  const chartData = {
    labels: monthlyExams.map((m) => `Month ${m._id}`),
    datasets: [
      {
        label: "Exams created",
        data: monthlyExams.map((m) => m.count),
        backgroundColor: "#E8A33D",
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Institutes" value={stats?.totalInstitutes ?? "—"} icon={FiHome} />
        <StatCard label="Students" value={stats?.totalStudents ?? "—"} icon={FiUsers} />
        <StatCard label="Exams" value={stats?.totalExams ?? "—"} icon={FiFileText} />
        <StatCard label="Questions" value={stats?.totalQuestions ?? "—"} icon={FiHelpCircle} />
        <StatCard label="Active exams" value={stats?.activeExams ?? "—"} icon={FiActivity} accentColor="text-success" />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display text-base font-semibold text-slate-100 mb-4">Exams created per month</h3>
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              maintainAspectRatio: false,
              scales: {
                x: { ticks: { color: "#8B93AC" }, grid: { color: "rgba(255,255,255,0.04)" } },
                y: { ticks: { color: "#8B93AC" }, grid: { color: "rgba(255,255,255,0.04)" } },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display text-base font-semibold text-slate-100 mb-2">System overview</h3>
        <p className="text-sm text-muted">
          Manage institutes from the Institutes tab. Subscription plans and billing management aren't wired up
          in this build — the Institute model has a <code className="text-accent">plan</code> field ready to
          extend.
        </p>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
