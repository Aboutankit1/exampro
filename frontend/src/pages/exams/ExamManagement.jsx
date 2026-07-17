import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPlus, FiX, FiClock, FiEye, FiSend, FiEdit3, FiEdit2, FiTrash2 } from "react-icons/fi";
import api from "../../services/api.js";

const emptyForm = {
  title: "",
  description: "",
  subject: "",
  instructions: "Read each question carefully. Do not switch tabs or exit fullscreen during the exam.",
  durationMinutes: 30,
  totalMarks: 20,
  passingMarks: 8,
  randomCount: 10,
  randomDifficulty: "",
  randomizeQuestions: true,
  randomizeOptions: true,
  negativeMarking: true,
  startDate: "",
  endDate: "",
  maxAttempts: 1,
};

const statusColor = {
  draft: "bg-ink-500 text-muted",
  upcoming: "bg-warning/15 text-warning",
  live: "bg-success/15 text-success",
  completed: "bg-ink-500 text-muted",
};

// Converts a stored ISO date string into the "YYYY-MM-DDTHH:mm" format a
// datetime-local input expects, in the browser's own local time — so an exam
// edited later shows the same wall-clock time it was originally set to.
const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ExamManagement = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null); // null = create mode, exam object = edit mode
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/exams");
    setExams(data.exams);
  };

  useEffect(() => {
    load();
    api.get("/subjects").then(({ data }) => {
      setSubjects(data.subjects);
      if (data.subjects.length) setForm((f) => ({ ...f, subject: f.subject || data.subjects[0]._id }));
    });
  }, []);

  const openCreate = () => {
    setForm({ ...emptyForm, subject: subjects[0]?._id || "" });
    setEditingExam(null);
    setShowModal(true);
  };

  const openEdit = (exam) => {
    setForm({
      title: exam.title,
      description: exam.description || "",
      subject: exam.subject?._id || exam.subject,
      instructions: exam.instructions || "",
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      randomCount: 0,
      randomDifficulty: "",
      randomizeQuestions: exam.randomizeQuestions,
      randomizeOptions: exam.randomizeOptions,
      negativeMarking: exam.negativeMarking,
      startDate: toDatetimeLocal(exam.startDate),
      endDate: toDatetimeLocal(exam.endDate),
      maxAttempts: exam.maxAttempts,
    });
    setEditingExam(exam);
    setShowModal(true);
  };

  const handleCreateSubmit = async (e, saveAsDraft) => {
    e.preventDefault();
    setLoading(true);
    try {
      // datetime-local inputs give a plain "2025-07-15T17:00" string with no
      // timezone info. `new Date(...)` in the browser correctly interprets that
      // as 17:00 in the browser's own timezone, and .toISOString() converts it
      // to an unambiguous UTC timestamp. Sending the raw string instead would
      // get misinterpreted as UTC by a server running in a different timezone
      // (e.g. Render defaults to UTC) — a 5:00 PM IST exam would silently get
      // stored as 5:00 PM UTC (10:30 PM IST) and never go "live" on time.
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        saveAsDraft,
      };
      await api.post("/exams", payload);
      toast.success(saveAsDraft ? "Saved as draft" : "Exam published — students have been notified");
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create exam. Make sure the question bank has enough questions for the selected subject.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Deliberately excludes randomCount/randomDifficulty/questions — editing
      // never touches the already-picked question set, only the exam's metadata.
      const payload = {
        title: form.title,
        description: form.description,
        subject: form.subject,
        instructions: form.instructions,
        durationMinutes: form.durationMinutes,
        totalMarks: form.totalMarks,
        passingMarks: form.passingMarks,
        randomizeQuestions: form.randomizeQuestions,
        randomizeOptions: form.randomizeOptions,
        negativeMarking: form.negativeMarking,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maxAttempts: form.maxAttempts,
      };
      await api.put(`/exams/${editingExam._id}`, payload);
      toast.success("Exam updated");
      setShowModal(false);
      setEditingExam(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update exam");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (examId) => {
    setPublishingId(examId);
    try {
      await api.put(`/exams/${examId}/publish`);
      toast.success("Exam published — students have been notified");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish exam");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (exam) => {
    if (!confirm(`Delete "${exam.title}"? Students will no longer be able to see or attempt it. This can't be undone.`)) return;
    setDeletingId(exam._id);
    try {
      await api.delete(`/exams/${exam._id}`);
      toast.success("Exam deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{exams.length} exam(s)</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus size={16} /> Create exam
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {exams.map((exam) => (
          <div key={exam._id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-display font-semibold text-slate-100">{exam.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[exam.liveStatus]}`}>{exam.liveStatus}</span>
            </div>
            <p className="text-sm text-muted mb-1">{exam.subject?.name} · {exam.totalQuestions} questions · {exam.totalMarks} marks</p>
            <p className="text-xs text-muted mb-3">
              {new Date(exam.startDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              {" → "}
              {new Date(exam.endDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <FiClock size={13} /> {exam.durationMinutes} min · Passing: {exam.passingMarks}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => navigate(`/exams/${exam._id}/preview`)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <FiEdit3 size={13} /> Preview
                </button>
                <button
                  onClick={() => openEdit(exam)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-600/60 border border-white/10 text-slate-300 hover:bg-ink-500/60"
                  title="Edit exam"
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(exam)}
                  disabled={deletingId === exam._id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-600/60 border border-white/10 text-danger hover:bg-danger/10 disabled:opacity-50"
                  title="Delete exam"
                >
                  <FiTrash2 size={13} />
                </button>
                {exam.liveStatus === "draft" ? (
                  <button
                    onClick={() => handlePublish(exam._id)}
                    disabled={publishingId === exam._id}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiSend size={13} /> {publishingId === exam._id ? "Publishing..." : "Publish"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/exams/${exam._id}/monitor`)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <FiEye size={13} /> Monitor
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {exams.length === 0 && (
          <p className="text-sm text-muted col-span-2">No exams yet. Create your first exam above.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-100">
                {editingExam ? "Edit exam" : "Create exam"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingExam(null); }} className="text-muted hover:text-white"><FiX size={20} /></button>
            </div>

            <form className="space-y-4" onSubmit={editingExam ? handleEditSubmit : undefined}>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Exam title</label>
                <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Subject</label>
                <select className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Instructions</label>
                <textarea rows={2} className="input-field" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              </div>

              {editingExam && (editingExam.liveStatus === "live" || editingExam.liveStatus === "completed") && (
                <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
                  This exam is already {editingExam.liveStatus}. Changing marks, timing, or attempts now could make
                  things inconsistent for students who've already started or finished it.
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Duration (min)</label>
                  <input type="number" className="input-field" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Total marks</label>
                  <input type="number" className="input-field" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Passing marks</label>
                  <input type="number" className="input-field" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: Number(e.target.value) })} />
                </div>
              </div>

              {!editingExam && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block"># Random questions to pick</label>
                    <input type="number" className="input-field" value={form.randomCount} onChange={(e) => setForm({ ...form, randomCount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Difficulty filter (optional)</label>
                    <select className="input-field" value={form.randomDifficulty} onChange={(e) => setForm({ ...form, randomDifficulty: e.target.value })}>
                      <option value="">Any</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              )}
              {editingExam && (
                <p className="text-xs text-muted bg-ink-600/30 rounded-lg p-3">
                  The question set ({editingExam.totalQuestions} questions) isn't editable here — it stays as
                  originally generated. You can still change everything else below.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Start date/time</label>
                  <input type="datetime-local" className="input-field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">End date/time</label>
                  <input type="datetime-local" className="input-field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1.5 block">Max attempts</label>
                <input type="number" className="input-field w-32" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} />
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-accent" checked={form.randomizeQuestions} onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })} />
                  Randomize question order
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-accent" checked={form.randomizeOptions} onChange={(e) => setForm({ ...form, randomizeOptions: e.target.checked })} />
                  Randomize options
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-accent" checked={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: e.target.checked })} />
                  Negative marking
                </label>
              </div>

              {!editingExam && (
                <p className="text-xs text-muted">
                  <strong className="text-slate-300">Save as draft</strong> keeps this hidden from students and sends no
                  notification — use Preview to check it, then Publish when ready.{" "}
                  <strong className="text-slate-300">Publish now</strong> makes it visible immediately and notifies
                  eligible students right away.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingExam(null); }} className="btn-secondary flex-1">Cancel</button>
                {editingExam ? (
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? "Saving..." : "Save changes"}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={(e) => handleCreateSubmit(e, true)} disabled={loading} className="btn-secondary flex-1">
                      Save as draft
                    </button>
                    <button type="button" onClick={(e) => handleCreateSubmit(e, false)} disabled={loading} className="btn-primary flex-1">
                      Publish now
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;