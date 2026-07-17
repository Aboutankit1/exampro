import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import AuthLayout from "./layouts/AuthLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import RegisterInstitute from "./pages/RegisterInstitute.jsx";
import RegisterStudent from "./pages/RegisterStudent.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import QuestionBank from "./pages/QuestionBank.jsx";
import Subjects from "./pages/Subjects.jsx";
import Exams from "./pages/Exams.jsx";
import Results from "./pages/Results.jsx";
import Profile from "./pages/Profile.jsx";
import Users from "./pages/Users.jsx";
import Institutes from "./pages/Institutes.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

import ExamTaking from "./pages/exams/ExamTaking.jsx";
import ExamResult from "./pages/exams/ExamResult.jsx";
import ExamMonitor from "./pages/exams/ExamMonitor.jsx";
import ExamPreview from "./pages/exams/ExamPreview.jsx";

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register-institute" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterInstitute />} />
        <Route path="/register-student" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterStudent />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Full-screen exam taking (no sidebar/navbar) */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/exam/:examId" element={<ExamTaking />} />
        <Route path="/exam-result/:attemptId" element={<ExamResult />} />
      </Route>

      {/* Dashboard shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute allowedRoles={["instituteadmin", "teacher"]} />}>
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/exams/:examId/monitor" element={<ExamMonitor />} />
            <Route path="/exams/:examId/preview" element={<ExamPreview />} />
          </Route>

          <Route path="/exams" element={<Exams />} />

          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/results" element={<Results />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["instituteadmin"]} />}>
            <Route path="/users" element={<Users />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
            <Route path="/institutes" element={<Institutes />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;