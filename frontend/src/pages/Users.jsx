import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { FiPlus, FiX, FiTrash2, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import api from "../services/api.js";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", batch: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/users", { params: roleFilter ? { role: roleFilter } : {} });
    setUsers(data.users);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/create-user", form);
      toast.success(`${form.role === "teacher" ? "Teacher" : "Student"} account created`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "student", batch: "", phone: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    await api.delete(`/users/${id}`);
    toast.success("User deactivated");
    load();
  };

  // ---- Excel template download ----
  const downloadTemplate = () => {
    const sample = [
      { name: "Aarav Mehta", email: "aarav@example.com", role: "student", batch: "2026-A", phone: "9876543210", password: "" },
      { name: "Priya Sharma", email: "priya@example.com", role: "teacher", batch: "", phone: "9876500000", password: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{ wch: 20 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "cbt-users-template.xlsx");
  };

  // ---- Excel upload + parse + bulk create ----
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        toast.error("The uploaded file has no rows");
        setUploading(false);
        return;
      }

      // normalize header casing (Name / NAME / name all map to "name")
      const normalized = rows.map((row) => {
        const obj = {};
        Object.keys(row).forEach((key) => {
          obj[key.trim().toLowerCase()] = row[key];
        });
        return {
          name: obj.name,
          email: obj.email,
          role: (obj.role || "student").toString().toLowerCase(),
          batch: obj.batch,
          phone: obj.phone,
          password: obj.password,
        };
      });

      const { data: result } = await api.post("/auth/bulk-create-users", { users: normalized });
      setUploadResult(result);
      if (result.createdCount > 0) toast.success(`${result.createdCount} account(s) created`);
      if (result.skippedCount > 0) toast.error(`${result.skippedCount} row(s) skipped — see details below`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed. Check the file format matches the template.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select className="input-field w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
        </select>

        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
            <FiDownload size={15} /> Download Excel template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FiUpload size={15} /> {uploading ? "Uploading..." : "Upload Excel"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus size={16} /> Add user
          </button>
        </div>
      </div>

      {/* Bulk upload results */}
      {uploadResult && (
        <div className="glass-card p-5 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-slate-100">Upload results</h3>
            <button onClick={() => setUploadResult(null)} className="text-muted hover:text-white"><FiX size={18} /></button>
          </div>

          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-success"><FiCheckCircle size={14} /> {uploadResult.createdCount} created</span>
            <span className="flex items-center gap-1.5 text-danger"><FiAlertCircle size={14} /> {uploadResult.skippedCount} skipped</span>
          </div>

          {uploadResult.created.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">
                Created accounts — share these temporary passwords with students/teachers (password emailing isn't wired up in this build):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-white/5">
                      <th className="py-1.5 pr-4 font-medium">Name</th>
                      <th className="py-1.5 pr-4 font-medium">Email</th>
                      <th className="py-1.5 pr-4 font-medium">Role</th>
                      <th className="py-1.5 pr-4 font-medium">Temp password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.created.map((u, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 pr-4 text-slate-200">{u.name}</td>
                        <td className="py-1.5 pr-4 text-muted">{u.email}</td>
                        <td className="py-1.5 pr-4 capitalize text-slate-300">{u.role}</td>
                        <td className="py-1.5 pr-4 font-mono text-accent">{u.temporaryPassword || "(from sheet)"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadResult.skipped.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">Skipped rows:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-white/5">
                      <th className="py-1.5 pr-4 font-medium">Email</th>
                      <th className="py-1.5 pr-4 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.skipped.map((s, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 pr-4 text-slate-200">{s.email}</td>
                        <td className="py-1.5 pr-4 text-danger">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-white/5">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Batch</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-slate-200">{u.name}</td>
                <td className="p-4 text-muted">{u.email}</td>
                <td className="p-4 capitalize text-slate-300">{u.role}</td>
                <td className="p-4 text-muted">{u.batch || "—"}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => handleDeactivate(u._id)} className="text-danger hover:bg-danger/10 w-8 h-8 rounded-lg flex items-center justify-center">
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-100">Add user</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Role</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Full name</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              {form.role === "student" && (
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Batch</label>
                  <input className="input-field" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                </div>
              )}
              <div>
                <label className="text-xs text-muted mb-1.5 block">Temporary password</label>
                <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">Create account</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
