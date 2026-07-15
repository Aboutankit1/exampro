import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiLoader, FiCheckCircle } from "react-icons/fi";
import api from "../services/api.js";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/auth/reset-password/${token}`, { password });
      setDone(true);
      toast.success("Password reset successful");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset link is invalid or has expired");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="glass-card p-8 animate-fadeIn text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-success/15 text-success flex items-center justify-center mb-4">
          <FiCheckCircle size={26} />
        </div>
        <h2 className="font-display text-xl font-semibold text-slate-100 mb-2">Password updated</h2>
        <p className="text-sm text-muted mb-6">You can now sign in with your new password.</p>
        <button onClick={() => navigate("/login")} className="btn-primary w-full">Go to sign in</button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 animate-fadeIn">
      <h2 className="font-display text-2xl font-semibold text-slate-100 mb-1">Set a new password</h2>
      <p className="text-sm text-muted mb-6">This reset link expires 30 minutes after it was requested.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1.5 block">New password</label>
          <input
            type="password"
            className="input-field"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Confirm new password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <FiLoader className="animate-spin" size={16} />}
          Reset password
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default ResetPassword;
