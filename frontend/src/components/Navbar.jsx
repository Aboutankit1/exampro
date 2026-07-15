import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut, FiUser } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { logoutUser } from "../redux/slices/authSlice.js";

const Navbar = ({ title }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-ink-800/70 backdrop-blur-md">
      <h1 className="font-display text-lg font-semibold text-slate-100">{title}</h1>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-ink-600/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-ink-800 font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm text-slate-200 hidden sm:block">{user?.name}</span>
            <FiChevronDown size={14} className="text-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 glass-card p-1.5 animate-fadeIn">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-200 hover:bg-ink-600/60 rounded-md transition-colors"
              >
                <FiUser size={14} /> Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-md transition-colors"
              >
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
