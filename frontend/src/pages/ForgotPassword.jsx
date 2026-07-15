import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiLoader, FiMail } from "react-icons/fi";
import api from "../services/api.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { message, resetToken? }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
      toast.success("Request submitted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 animate-fadeIn">
      <h2 className="font-display text-2xl font-semibold text-slate-100 mb-1">Reset your password</h2>
      <p className="text-sm text-muted mb-6">
        Enter your account email and we'll send you a reset link.
      </p>

      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-success flex items-start gap-2">
            <FiMail className="shrink-0 mt-0.5" size={15} />
            {result.message}
          </p>
          {result.resetToken && (
            <div className="text-xs bg-ink-600/40 border border-white/10 rounded-lg p-3">
              <p className="text-muted mb-1">
                Email isn't configured on this server yet — here's your reset link for local testing:
              </p>
              <code className="text-accent break-all">
                {window.location.origin}/reset-password/{result.resetToken}
              </code>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            className="input-field"
            placeholder="you@institute.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <FiLoader className="animate-spin" size={16} />}
            Send reset instructions
          </button>
        </form>
      )}

      <p className="text-sm text-muted text-center mt-6">
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
