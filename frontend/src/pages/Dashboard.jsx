import { useSelector } from "react-redux";
import SuperAdminDashboard from "./dashboards/SuperAdminDashboard.jsx";
import InstituteAdminDashboard from "./dashboards/InstituteAdminDashboard.jsx";
import TeacherDashboard from "./dashboards/TeacherDashboard.jsx";
import StudentDashboard from "./dashboards/StudentDashboard.jsx";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  switch (user?.role) {
    case "superadmin":
      return <SuperAdminDashboard />;
    case "instituteadmin":
      return <InstituteAdminDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    default:
      return null;
  }
};

export default Dashboard;
