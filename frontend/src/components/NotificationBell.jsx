import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle, FiFileText, FiAward, FiUsers, FiInfo } from "react-icons/fi";
import api from "../services/api.js";

const TYPE_ICON = {
  exam_new: FiFileText,
  exam_reminder: FiFileText,
  result_published: FiAward,
  exam_submitted: FiUsers,
  new_institute: FiUsers,
  new_student: FiUsers,
  system: FiInfo,
};

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const markOneRead = async (n) => {
    if (!n.isRead) {
      await api.put(`/notifications/${n._id}/read`);
      setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(c - 1, 0));
    }
    setOpen(false);
    if (n.relatedExam) navigate("/exams");
  };

  const markAllRead = async (e) => {
    e.stopPropagation();
    await api.put("/notifications/read-all");
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-ink-600/60 border border-white/10 text-slate-200 hover:bg-ink-500/60 transition-colors relative"
      >
        <FiBell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card p-2 animate-fadeIn z-30">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-medium text-slate-100">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent hover:underline flex items-center gap-1">
                <FiCheckCircle size={12} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No notifications yet</p>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] || FiInfo;
                return (
                  <button
                    key={n._id}
                    onClick={() => markOneRead(n)}
                    className={`w-full text-left flex items-start gap-3 px-2.5 py-2.5 rounded-lg transition-colors ${
                      n.isRead ? "hover:bg-ink-600/40" : "bg-accent/10 hover:bg-accent/15"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.isRead ? "bg-ink-600/60 text-muted" : "bg-accent/20 text-accent"}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${n.isRead ? "text-slate-300" : "text-slate-100 font-medium"}`}>{n.title}</p>
                      <p className="text-xs text-muted line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
