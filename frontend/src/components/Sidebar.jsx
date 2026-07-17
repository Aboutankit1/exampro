import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiGrid,
  FiBookOpen,
  FiBook,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiHome,
  FiAward,
  FiLayers,
} from "react-icons/fi";

const menus = {
  superadmin: [
    { to: "/dashboard", label: "Overview", icon: FiGrid },
    { to: "/institutes", label: "Institutes", icon: FiHome },
    { to: "/settings", label: "System Settings", icon: FiSettings },
  ],
  instituteadmin: [
    { to: "/dashboard", label: "Overview", icon: FiGrid },
    { to: "/users", label: "Teachers & Students", icon: FiUsers },
    { to: "/subjects", label: "Subjects", icon: FiBook },
    { to: "/question-bank", label: "Question Bank", icon: FiBookOpen },
    { to: "/exams", label: "Exams", icon: FiFileText },
    { to: "/reports", label: "Reports", icon: FiBarChart2 },
    { to: "/profile", label: "Profile", icon: FiSettings },
  ],
  teacher: [
    { to: "/dashboard", label: "Overview", icon: FiGrid },
    { to: "/subjects", label: "Subjects", icon: FiBook },
    { to: "/question-bank", label: "Question Bank", icon: FiBookOpen },
    { to: "/exams", label: "Exams", icon: FiFileText },
    { to: "/reports", label: "Reports", icon: FiBarChart2 },
    { to: "/profile", label: "Profile", icon: FiSettings },
  ],
  student: [
    { to: "/dashboard", label: "Overview", icon: FiGrid },
    { to: "/exams", label: "My Exams", icon: FiLayers },
    { to: "/results", label: "Results", icon: FiAward },
    { to: "/profile", label: "Profile", icon: FiSettings },
  ],
};

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const items = menus[user?.role] || [];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/5 bg-ink-800/80 backdrop-blur-md px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-display font-bold text-ink-800">
          E
        </div>
        <div>
          <p className="font-display font-semibold text-slate-100 leading-tight">ExamCore</p>
          <p className="text-xs text-muted leading-tight capitalize">{user?.role?.replace("admin", " admin")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-slate-300 hover:bg-ink-600/50 hover:text-white border border-transparent"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="text-xs text-muted px-3 pt-4 border-t border-white/5">
        <p>ExamCore CBT Portal</p>
        <p>v1.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;