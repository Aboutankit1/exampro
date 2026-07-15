import { useSelector } from "react-redux";
import ExamManagement from "./exams/ExamManagement.jsx";
import StudentExamList from "./exams/StudentExamList.jsx";

const Exams = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === "student") return <StudentExamList />;
  return <ExamManagement />;
};

export default Exams;
