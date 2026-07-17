import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiX, FiEdit2, FiTrash2, FiBook } from "react-icons/fi";
import api from "../services/api.js";

const emptySubject = { name: "", code: "", topics: "" };

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptySubject);

  const load = async () => {
    const { data } = await api.get("/subjects");
    setSubjects(data.subjects);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptySubject);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (subject) => {
    setForm({
      name: subject.name,
      code: subject.code || "",
      topics: (subject.topics || []).join(", "),
    });
    setEditingId(subject._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      topics: form.topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) {
        await api.put(`/subjects/${editingId}`, payload);
        toast.success("Subject updated");
      } else {
        await api.post("/subjects", payload);
        toast.success("Subject created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save subject");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subject) => {
    if (
      !confirm(
        `Delete "${subject.name}"? Questions and exams already linked to this subject will keep referencing it, but you won't be able to pick it for new questions or exams.`
      )
    )
      return;
    try {
      await api.delete(`/subjects/${subject._id}`);
      toast.success("Subject deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete subject");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{subjects.length} subject(s)</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus size={16} /> New subject
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {subjects.map((s) => (
          <div key={s._id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <FiBook size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-slate-100 truncate">{s.name}</h3>
                  {s.code && <p className="text-xs font-mono text-muted">{s.code}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(s)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-600/60 text-slate-300" title="Edit">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleDelete(s)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-danger/10 text-danger" title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>

            {s.topics?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.topics.map((t, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-ink-600/60 text-muted">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted mt-3">No topics added yet</p>
            )}
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-sm text-muted col-span-2">No subjects yet. Create your first subject above.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-100">
                {editingId ? "Edit subject" : "New subject"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Subject name</label>
                <input
                  className="input-field"
                  placeholder="e.g. General Science"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Code (optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. SCI101"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Topics (comma-separated)</label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Physics, Chemistry, Biology"
                  value={form.topics}
                  onChange={(e) => setForm({ ...form, topics: e.target.value })}
                />
                <p className="text-xs text-muted mt-1">Used as topic suggestions when adding questions to this subject.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {editingId ? "Save changes" : "Create subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;