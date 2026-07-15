import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiPlay, FiCheckCircle } from "react-icons/fi";
import api from "../../services/api.js";

const statusColor = { upcoming: "bg-warning/15 text-warning", live: "bg-success/15 text-success", completed: "bg-ink-500 text-muted" };

const StudentExamList = () => {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/exams").then(({ data }) => setExams(data.exams));
    api.get("/attempts/my").then(({ data }) => setAttempts(data.attempts));
  }, []);

  const attemptFor = (examId) => attempts.find((a) => a.exam?._id === examId || a.exam === examId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{exams.length} exam(s) assigned to you</p>
      <div className="grid md:grid-cols-2 gap-4">
        {exams.map((exam) => {
          const myAttempt = attemptFor(exam._id);
          const alreadyDone = !!myAttempt; // one attempt per student by default (exam.maxAttempts)

          return (
            <div key={exam._id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold text-slate-100">{exam.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[exam.liveStatus]}`}>{exam.liveStatus}</span>
              </div>
              <p className="text-sm text-muted mb-1">{exam.subject?.name} · {exam.totalQuestions} questions · {exam.totalMarks} marks</p>
              <p className="text-xs text-muted mb-4">
                {exam.liveStatus === "upcoming" ? "Starts: " : exam.liveStatus === "live" ? "Closes: " : "Was open: "}
                {exam.liveStatus === "live"
                  ? new Date(exam.endDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                  : new Date(exam.startDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <FiClock size={13} /> {exam.durationMinutes} min
                </span>

                {alreadyDone ? (
                  myAttempt.status === "evaluated" ? (
                    <button onClick={() => navigate(`/exam-result/${myAttempt._id}`)} className="btn-secondary text-sm flex items-center gap-2">
                      <FiCheckCircle size={14} /> View result
                    </button>
                  ) : myAttempt.status === "in_progress" && exam.liveStatus === "live" ? (
                    <button onClick={() => navigate(`/exam/${exam._id}`)} className="btn-primary text-sm flex items-center gap-2">
                      <FiPlay size={14} /> Resume exam
                    </button>
                  ) : (
                    <span className="text-xs text-muted px-3 py-2">Already attempted</span>
                  )
                ) : (
                  <button
                    disabled={exam.liveStatus !== "live"}
                    onClick={() => navigate(`/exam/${exam._id}`)}
                    className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                  >
                    <FiPlay size={14} /> {exam.liveStatus === "live" ? "Start exam" : exam.liveStatus === "upcoming" ? "Not started" : "Closed"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {exams.length === 0 && <p className="text-sm text-muted col-span-2">No exams assigned yet.</p>}
      </div>
    </div>
  );
};

export default StudentExamList;
