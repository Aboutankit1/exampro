import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiClock } from "react-icons/fi";
import api from "../services/api.js";

const planColor = { free: "bg-ink-500 text-muted", basic: "bg-accent/15 text-accent", pro: "bg-success/15 text-success", enterprise: "bg-warning/15 text-warning" };
const approvalColor = { pending: "bg-warning/15 text-warning", approved: "bg-success/15 text-success", rejected: "bg-danger/15 text-danger" };

const Institutes = () => {
  const [institutes, setInstitutes] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/institutes");
    setInstitutes(data.institutes);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (inst) => {
    await api.put(`/institutes/${inst._id}`, { isActive: !inst.isActive });
    toast.success(`Institute ${inst.isActive ? "deactivated" : "activated"}`);
    load();
  };

  const changePlan = async (inst, plan) => {
    await api.put(`/institutes/${inst._id}`, { plan });
    toast.success("Plan updated");
    load();
  };

  const approve = async (inst) => {
    setBusyId(inst._id);
    try {
      await api.put(`/institutes/${inst._id}/approve`);
      toast.success(`${inst.name} approved`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (inst) => {
    const reason = prompt(`Reason for rejecting "${inst.name}"? (optional, shown to the institute admin)`);
    if (reason === null) return; // cancelled
    setBusyId(inst._id);
    try {
      await api.put(`/institutes/${inst._id}/reject`, { reason });
      toast.success(`${inst.name} rejected`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  const pending = institutes.filter((i) => i.approvalStatus === "pending");
  const others = institutes.filter((i) => i.approvalStatus !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="glass-card p-5 border border-warning/25">
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="text-warning" size={16} />
            <h3 className="font-display font-semibold text-slate-100">Pending approval ({pending.length})</h3>
          </div>
          <div className="space-y-3">
            {pending.map((inst) => (
              <div key={inst._id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-ink-600/30">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{inst.name} <span className="font-mono text-xs text-muted">({inst.code})</span></p>
                  <p className="text-xs text-muted truncate">Admin: {inst.admin?.name} · {inst.admin?.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approve(inst)}
                    disabled={busyId === inst._id}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiCheck size={13} /> Approve
                  </button>
                  <button
                    onClick={() => reject(inst)}
                    disabled={busyId === inst._id}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-danger disabled:opacity-50"
                  >
                    <FiX size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-white/5">
              <th className="p-4 font-medium">Institute</th>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Admin</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Approval</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {others.map((inst) => (
              <tr key={inst._id} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-slate-200">{inst.name}</td>
                <td className="p-4 font-mono text-muted">{inst.code}</td>
                <td className="p-4 text-muted">{inst.admin?.name || "—"}</td>
                <td className="p-4">
                  <select value={inst.plan} onChange={(e) => changePlan(inst, e.target.value)} className={`text-xs px-2 py-1 rounded-full bg-transparent border-0 ${planColor[inst.plan]}`}>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${approvalColor[inst.approvalStatus]}`}>{inst.approvalStatus}</span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inst.isActive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                    {inst.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => toggleActive(inst)} className="btn-secondary text-xs py-1.5 px-3">
                    {inst.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {others.length === 0 && pending.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">No institutes registered yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Institutes;
