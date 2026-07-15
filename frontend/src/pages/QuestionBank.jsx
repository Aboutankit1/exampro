import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { FiPlus, FiSearch, FiCopy, FiTrash2, FiEdit2, FiX, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import api from "../services/api.js";

const emptyQuestion = {
  subject: "",
  topic: "",
  type: "mcq",
  questionText: "",
  difficulty: "medium",
  marks: 1,
  negativeMarks: 0,
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  correctNumericAnswer: "",
  numericTolerance: 0,
  correctTextAnswer: "",
  explanation: "",
};

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadQuestions = async () => {
    const params = {};
    if (search) params.search = search;
    if (filterSubject) params.subject = filterSubject;
    if (filterDifficulty) params.difficulty = filterDifficulty;
    const { data } = await api.get("/questions", { params });
    setQuestions(data.questions);
  };

  const loadSubjects = async () => {
    const { data } = await api.get("/subjects");
    setSubjects(data.subjects);
    if (data.subjects.length && !form.subject) {
      setForm((f) => ({ ...f, subject: data.subjects[0]._id }));
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterSubject, filterDifficulty]);

  const openCreate = () => {
    setForm({ ...emptyQuestion, subject: subjects[0]?._id || "" });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (q) => {
    setForm({
      subject: q.subject?._id || q.subject,
      topic: q.topic,
      type: q.type,
      questionText: q.questionText,
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      options: q.options?.length ? q.options : emptyQuestion.options,
      correctNumericAnswer: q.correctNumericAnswer ?? "",
      numericTolerance: q.numericTolerance ?? 0,
      correctTextAnswer: q.correctTextAnswer ?? "",
      explanation: q.explanation ?? "",
    });
    setEditingId(q._id);
    setShowModal(true);
  };

  const handleOptionChange = (idx, field, value) => {
    const options = [...form.options];
    if (field === "isCorrect" && (form.type === "mcq" || form.type === "true_false")) {
      // single-correct types: only one option can be correct
      options.forEach((o, i) => (o.isCorrect = i === idx ? value : false));
    } else {
      options[idx] = { ...options[idx], [field]: value };
    }
    setForm({ ...form, options });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!["mcq", "multi_correct", "true_false"].includes(form.type)) delete payload.options;
      if (editingId) {
        await api.put(`/questions/${editingId}`, payload);
        toast.success("Question updated");
      } else {
        await api.post("/questions", payload);
        toast.success("Question created");
      }
      setShowModal(false);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id) => {
    await api.post(`/questions/${id}/duplicate`);
    toast.success("Question duplicated");
    loadQuestions();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this question?")) return;
    await api.delete(`/questions/${id}`);
    toast.success("Question deleted");
    loadQuestions();
  };

  // ---- Excel template download ----
  const downloadTemplate = () => {
    const sample = [
      {
        subject: subjects[0]?.name || "General Science",
        topic: "Physics",
        type: "mcq",
        questionText: "What is the SI unit of force?",
        difficulty: "easy",
        marks: 2,
        negativeMarks: 0.5,
        option1: "Newton",
        option2: "Joule",
        option3: "Watt",
        option4: "Pascal",
        correctOption: "1",
        correctNumericAnswer: "",
        numericTolerance: "",
        correctTextAnswer: "",
        explanation: "Force is measured in Newtons.",
      },
      {
        subject: subjects[0]?.name || "General Science",
        topic: "Chemistry",
        type: "multi_correct",
        questionText: "Which of these are noble gases?",
        difficulty: "medium",
        marks: 3,
        negativeMarks: 1,
        option1: "Helium",
        option2: "Neon",
        option3: "Oxygen",
        option4: "Argon",
        correctOption: "1,2,4",
        correctNumericAnswer: "",
        numericTolerance: "",
        correctTextAnswer: "",
        explanation: "",
      },
      {
        subject: subjects[0]?.name || "General Science",
        topic: "Biology",
        type: "true_false",
        questionText: "The human heart has four chambers.",
        difficulty: "easy",
        marks: 1,
        negativeMarks: 0,
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctOption: "true",
        correctNumericAnswer: "",
        numericTolerance: "",
        correctTextAnswer: "",
        explanation: "",
      },
      {
        subject: subjects[0]?.name || "General Science",
        topic: "Physics",
        type: "numerical",
        questionText: "Value of g (m/s^2), rounded?",
        difficulty: "medium",
        marks: 2,
        negativeMarks: 0,
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctOption: "",
        correctNumericAnswer: 10,
        numericTolerance: 0,
        correctTextAnswer: "",
        explanation: "",
      },
      {
        subject: subjects[0]?.name || "General Science",
        topic: "Chemistry",
        type: "fill_blank",
        questionText: "Chemical symbol for Sodium is ____.",
        difficulty: "easy",
        marks: 1,
        negativeMarks: 0,
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctOption: "",
        correctNumericAnswer: "",
        numericTolerance: "",
        correctTextAnswer: "Na",
        explanation: "",
      },
    ];

    const instructions = [
      { field: "subject", note: "Must exactly match an existing subject name in your question bank (case-insensitive)." },
      { field: "type", note: "One of: mcq, multi_correct, true_false, numerical, fill_blank, descriptive" },
      { field: "option1-4", note: "Used for mcq / multi_correct only. Leave blank for other types." },
      { field: "correctOption", note: "mcq: option number (e.g. 2). multi_correct: comma-separated numbers (e.g. 1,3). true_false: 'true' or 'false'." },
      { field: "correctNumericAnswer / numericTolerance", note: "Used for numerical type only." },
      { field: "correctTextAnswer", note: "Used for fill_blank type only (case-insensitive match)." },
      { field: "marks / negativeMarks", note: "Numbers. negativeMarks is deducted only if the exam has negative marking enabled." },
    ];

    const wsQuestions = XLSX.utils.json_to_sheet(sample);
    wsQuestions["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 10 }, { wch: 7 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 24 },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 30 }, { wch: 70 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Questions");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    XLSX.writeFile(wb, "cbt-questions-template.xlsx");
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

      const localSkipped = [];
      const payload = [];

      rows.forEach((row) => {
        const r = {};
        Object.keys(row).forEach((key) => (r[key.trim().toLowerCase()] = row[key]));

        const subjectName = (r.subject || "").toString().trim();
        const subjectMatch = subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());
        const type = (r.type || "").toString().trim().toLowerCase();
        const questionText = (r.questiontext || "").toString().trim();

        if (!subjectMatch) {
          localSkipped.push({ questionText: questionText || "(blank)", reason: `Unknown subject "${subjectName}" — create it first in Question Bank` });
          return;
        }
        if (!questionText) {
          localSkipped.push({ questionText: "(blank)", reason: "Missing questionText" });
          return;
        }
        if (!["mcq", "multi_correct", "true_false", "numerical", "fill_blank", "descriptive"].includes(type)) {
          localSkipped.push({ questionText, reason: `Invalid type "${type}"` });
          return;
        }

        const q = {
          subject: subjectMatch._id,
          topic: (r.topic || "").toString().trim(),
          type,
          questionText,
          difficulty: ["easy", "medium", "hard"].includes(r.difficulty) ? r.difficulty : "medium",
          marks: Number(r.marks) || 1,
          negativeMarks: Number(r.negativemarks) || 0,
          explanation: (r.explanation || "").toString().trim(),
        };

        if (type === "mcq" || type === "multi_correct") {
          const opts = [r.option1, r.option2, r.option3, r.option4]
            .map((t) => (t || "").toString().trim())
            .filter((t) => t.length > 0);
          const correctIdx = (r.correctoption || "").toString().split(",").map((n) => parseInt(n.trim(), 10));
          q.options = opts.map((text, idx) => ({ text, isCorrect: correctIdx.includes(idx + 1) }));
        } else if (type === "true_false") {
          const correct = (r.correctoption || "").toString().trim().toLowerCase();
          q.options = [
            { text: "True", isCorrect: correct === "true" || correct === "1" },
            { text: "False", isCorrect: correct === "false" || correct === "2" },
          ];
        } else if (type === "numerical") {
          q.correctNumericAnswer = Number(r.correctnumericanswer) || 0;
          q.numericTolerance = Number(r.numerictolerance) || 0;
        } else if (type === "fill_blank") {
          q.correctTextAnswer = (r.correcttextanswer || "").toString().trim();
        }

        payload.push(q);
      });

      if (payload.length === 0) {
        setUploadResult({ createdCount: 0, skippedCount: localSkipped.length, created: [], skipped: localSkipped });
        toast.error("No valid rows to upload — see details below");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const { data: result } = await api.post("/questions/bulk", { questions: payload });
      const mergedSkipped = [...localSkipped, ...result.skipped];
      setUploadResult({ ...result, skipped: mergedSkipped, skippedCount: mergedSkipped.length });
      if (result.createdCount > 0) toast.success(`${result.createdCount} question(s) created`);
      if (mergedSkipped.length > 0) toast.error(`${mergedSkipped.length} row(s) skipped — see details below`);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed. Check the file format matches the template.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const difficultyColor = { easy: "text-success", medium: "text-warning", hard: "text-danger" };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              className="input-field pl-9"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-field w-auto" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <select className="input-field w-auto" value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
            <option value="">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const name = prompt("New subject name (e.g. Mathematics):");
              if (!name) return;
              try {
                await api.post("/subjects", { name });
                toast.success("Subject created");
                loadSubjects();
              } catch (err) {
                toast.error(err.response?.data?.message || "Failed to create subject");
              }
            }}
            className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <FiPlus size={16} /> Subject
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
            <FiPlus size={16} /> New question
          </button>
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap">
            <FiDownload size={15} /> Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
          >
            <FiUpload size={15} /> {uploading ? "Uploading..." : "Upload Excel"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

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

          {uploadResult.skipped?.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">Skipped rows:</p>
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-white/5 sticky top-0 bg-ink-700">
                      <th className="py-1.5 pr-4 font-medium">Question</th>
                      <th className="py-1.5 pr-4 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.skipped.map((s, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 pr-4 text-slate-200 max-w-xs truncate">{s.questionText}</td>
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

      <div className="glass-card divide-y divide-white/5">
        {questions.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No questions yet. {subjects.length === 0 && "Create a subject first, then add questions."}
          </p>
        ) : (
          questions.map((q) => (
            <div key={q._id} className="p-4 flex items-start justify-between gap-4 hover:bg-ink-600/20 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-ink-600/60 text-muted uppercase">{q.type.replace("_", " ")}</span>
                  <span className={`text-xs font-medium ${difficultyColor[q.difficulty]}`}>{q.difficulty}</span>
                  <span className="text-xs text-muted">{q.subject?.name}</span>
                  <span className="text-xs text-muted">· {q.marks} marks</span>
                </div>
                <p className="text-sm text-slate-200 truncate">{q.questionText}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(q)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-600/60 text-slate-300" title="Edit">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleDuplicate(q._id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-600/60 text-slate-300" title="Duplicate">
                  <FiCopy size={14} />
                </button>
                <button onClick={() => handleDelete(q._id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-danger/10 text-danger" title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-100">
                {editingId ? "Edit question" : "New question"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Subject</label>
                  <select className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required>
                    {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Topic</label>
                  <input className="input-field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Type</label>
                  <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="mcq">MCQ (single correct)</option>
                    <option value="multi_correct">Multiple correct</option>
                    <option value="true_false">True / False</option>
                    <option value="numerical">Numerical</option>
                    <option value="fill_blank">Fill in the blank</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Difficulty</label>
                  <select className="input-field" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Marks</label>
                  <input type="number" step="0.5" className="input-field" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1.5 block">Question text</label>
                <textarea rows={3} className="input-field" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} required />
              </div>

              {(form.type === "mcq" || form.type === "multi_correct" || form.type === "true_false") && (
                <div>
                  <label className="text-xs text-muted mb-2 block">
                    Options {form.type === "multi_correct" ? "(check all correct answers)" : "(select the correct answer)"}
                  </label>
                  <div className="space-y-2">
                    {(form.type === "true_false" ? form.options.slice(0, 2) : form.options).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type={form.type === "multi_correct" ? "checkbox" : "radio"}
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={(e) => handleOptionChange(idx, "isCorrect", e.target.checked ?? e.target.value)}
                          className="accent-accent"
                        />
                        <input
                          className="input-field flex-1"
                          value={form.type === "true_false" ? (idx === 0 ? "True" : "False") : opt.text}
                          disabled={form.type === "true_false"}
                          placeholder={`Option ${idx + 1}`}
                          onChange={(e) => handleOptionChange(idx, "text", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.type === "numerical" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Correct numeric answer</label>
                    <input type="number" className="input-field" value={form.correctNumericAnswer} onChange={(e) => setForm({ ...form, correctNumericAnswer: Number(e.target.value) })} required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Tolerance (±)</label>
                    <input type="number" className="input-field" value={form.numericTolerance} onChange={(e) => setForm({ ...form, numericTolerance: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {form.type === "fill_blank" && (
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Correct answer (text, case-insensitive)</label>
                  <input className="input-field" value={form.correctTextAnswer} onChange={(e) => setForm({ ...form, correctTextAnswer: e.target.value })} required />
                </div>
              )}

              {form.type !== "descriptive" && (
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Negative marks (deducted if wrong)</label>
                  <input type="number" step="0.25" className="input-field" value={form.negativeMarks} onChange={(e) => setForm({ ...form, negativeMarks: Number(e.target.value) })} />
                </div>
              )}

              <div>
                <label className="text-xs text-muted mb-1.5 block">Explanation (shown after result, optional)</label>
                <textarea rows={2} className="input-field" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {editingId ? "Save changes" : "Create question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
