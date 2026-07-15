import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiLoader } from "react-icons/fi";
import { registerStudent, clearError } from "../redux/slices/authSlice.js";

const RegisterStudent = () => {
  const { register, handleSubmit } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const onSubmit = async (formData) => {
    dispatch(clearError());
    const result = await dispatch(registerStudent(formData));
    if (registerStudent.fulfilled.match(result)) {
      toast.success("Account created!");
      navigate("/dashboard");
    } else {
      toast.error(result.payload || "Registration failed");
    }
  };

  return (
    <div className="glass-card p-8 animate-fadeIn">
      <h2 className="font-display text-2xl font-semibold text-slate-100 mb-1">Create student account</h2>
      <p className="text-sm text-muted mb-6">Join your institute using its unique code.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1.5 block">Institute code</label>
          <input className="input-field uppercase" placeholder="EVEREST" {...register("instituteCode", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Full name</label>
          <input className="input-field" placeholder="Aarav Mehta" {...register("name", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Email</label>
          <input type="email" className="input-field" placeholder="you@example.com" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Batch (optional)</label>
          <input className="input-field" placeholder="2026-A" {...register("batch")} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="Minimum 6 characters"
            {...register("password", { required: true, minLength: 6 })}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <FiLoader className="animate-spin" size={16} />}
          Create account
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterStudent;
