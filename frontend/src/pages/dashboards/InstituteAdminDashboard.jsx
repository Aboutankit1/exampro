import { useEffect, useState } from "react";
import { FiUsers, FiBookOpen, FiFileText, FiHelpCircle, FiActivity, FiCheckCircle } from "react-icons/fi";
import StatCard from "../../components/StatCard.jsx";
import api from "../../services/api.js";

const InstituteAdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/institute-admin").then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students" value={stats?.totalStudents ?? "—"} icon={FiUsers} />
        <StatCard label="Teachers" value={stats?.totalTeachers ?? "—"} icon={FiUsers} />
        <StatCard label="Question bank" value={stats?.totalQuestions ?? "—"} icon={FiHelpCircle} />
        <StatCard label="Total exams" value={stats?.totalExams ?? "—"} icon={FiFileText} />
        <StatCard label="Active exams" value={stats?.activeExams ?? "—"} icon={FiActivity} accentColor="text-success" />
        <StatCard label="Completed exams" value={stats?.completedExams ?? "—"} icon={FiBookOpen} />
        <StatCard
          label="Pass percentage"
          value={stats ? `${stats.passPercentage}%` : "—"}
          icon={FiCheckCircle}
          accentColor="text-success"
        />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display text-base font-semibold text-slate-100 mb-2">Quick actions</h3>
        <div className="flex flex-wrap gap-3 mt-3">
          <a href="/question-bank" className="btn-secondary text-sm">Add questions</a>
          <a href="/exams" className="btn-secondary text-sm">Schedule an exam</a>
          <a href="/users" className="btn-secondary text-sm">Invite a teacher</a>
        </div>
      </div>
    </div>
  );
};

export default InstituteAdminDashboard;
