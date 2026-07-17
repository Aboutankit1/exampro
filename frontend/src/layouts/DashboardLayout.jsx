import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";

const titleMap = {
  "/dashboard": "Overview",
  "/question-bank": "Question Bank",
  "/subjects": "Subjects",
  "/exams": "Exams",
  "/results": "Results",
  "/profile": "My Profile",
  "/users": "Teachers & Students",
  "/reports": "Reports & Analytics",
  "/institutes": "Institutes",
  "/settings": "System Settings",
};

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const title = titleMap[pathname] || "ExamCore";

  return (
    <div className="flex min-h-screen bg-ink-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto animate-fadeIn">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;