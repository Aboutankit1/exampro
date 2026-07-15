import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCamera, FiAlertTriangle, FiX, FiRefreshCw } from "react-icons/fi";
import api from "../../services/api.js";

const STATUS_META = {
  not_started: { label: "Not started", color: "bg-ink-500 text-muted" },
  in_progress: { label: "In progress", color: "bg-warning/15 text-warning" },
  submitted: { label: "Submitted", color: "bg-accent/15 text-accent" },
  evaluated: { label: "Evaluated", color: "bg-success/15 text-success" },
};

const violationColor = (count) => {
  if (count === 0) return "text-success";
  if (count < 3) return "text-warning";
  return "text-danger";
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const ExamMonitor = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/exams/${examId}/monitor`);
      setExam(data.exam);
      setStudents(data.students);
      setLastRefreshed(new Date());
    } catch {
      /* keep showing last known data */
    }
  }, [examId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // live refresh every 8s
    return () => clearInterval(interval);
  }, [load]);

  const openDetail = async (student) => {
    if (!student.attemptId) return;
    setDetailLoading(true);
    setDetail({ student: student.student });
    try {
      const { data } = await api.get(`/exams/${examId}/monitor/${student.attemptId}`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const summary = students.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      if (s.violationCount >= 3) acc.critical = (acc.critical || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/exams")} className="w-9 h-9 rounded-lg bg-ink-600/60 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-ink-500/60">
            <FiArrowLeft size={15} />
          </button>
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">{exam?.title || "Live monitoring"}</h2>
            <p className="text-xs text-muted">
              {lastRefreshed ? `Updated ${timeAgo(lastRefreshed)}` : "Loading..."} · auto-refreshes every 8s
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <FiRefreshCw size={14} /> Refresh now
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">In progress</p>
          <p className="text-xl font-display font-semibold text-warning">{summary.in_progress || 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">Submitted</p>
          <p className="text-xl font-display font-semibold text-accent">{(summary.submitted || 0) + (summary.evaluated || 0)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">Not started</p>
          <p className="text-xl font-display font-semibold text-slate-200">{summary.not_started || 0}</p>
        </div>
        <div className="glass-card p-4 border border-danger/20">
          <p className="text-xs text-muted mb-1">Critical (3+ violations)</p>
          <p className="text-xl font-display font-semibold text-danger">{summary.critical || 0}</p>
        </div>
      </div>

      <div className="glass-card divide-y divide-white/5">
        {students.length === 0 ? (
          <p className="p-6 text-sm text-muted">No students match this exam's batch yet.</p>
        ) : (
          students
            .slice()
            .sort((a, b) => b.violationCount - a.violationCount || (a.status === "not_started" ? 1 : -1))
            .map((s) => (
              <div key={s.student._id} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-600/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-ink-800 font-semibold text-sm shrink-0">
                    {s.student.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{s.student.name}</p>
                    <p className="text-xs text-muted truncate">{s.student.email} {s.student.batch && `· ${s.student.batch}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {s.violationCount > 0 && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${violationColor(s.violationCount)}`}>
                      <FiAlertTriangle size={13} /> {s.violationCount}/3
                    </span>
                  )}
                  {s.snapshotCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <FiCamera size={13} /> {s.snapshotCount}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[s.status].color}`}>{STATUS_META[s.status].label}</span>
                  <button
                    onClick={() => openDetail(s)}
                    disabled={!s.attemptId}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-100">{detail.student?.name}</h3>
                <p className="text-xs text-muted">{detail.student?.email}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted hover:text-white"><FiX size={20} /></button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="glass-card p-3">
                    <p className="text-xs text-muted">Status</p>
                    <p className="text-slate-100 capitalize">{detail.status?.replace("_", " ")}</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-xs text-muted">Violations</p>
                    <p className={violationColor(detail.violationCount)}>{detail.violationCount}/3</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-xs text-muted">Auto-submitted</p>
                    <p className="text-slate-100">{detail.autoSubmitted ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Violation timeline</h4>
                  {detail.violations?.length ? (
                    <div className="space-y-1.5">
                      {detail.violations.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-ink-600/30 rounded-lg px-3 py-2">
                          <span className="text-slate-300 capitalize">{v.type.replace("_", " ")}</span>
                          <span className="text-muted">{new Date(v.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No violations recorded.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Camera snapshots ({detail.snapshots?.length || 0})</h4>
                  {detail.snapshots?.length ? (
                    <div className="grid grid-cols-4 gap-2">
                      {detail.snapshots.map((snap, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-white/10 relative aspect-video bg-ink-900">
                          <img src={snap.image} alt={`snapshot ${idx}`} className="w-full h-full object-cover" />
                          <span className={`absolute bottom-0.5 left-0.5 text-[9px] px-1 rounded ${snap.trigger === "violation" ? "bg-danger/80" : "bg-black/60"} text-white`}>
                            {snap.trigger === "violation" ? "flag" : snap.trigger === "exam_start" ? "start" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No snapshots captured yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamMonitor;
