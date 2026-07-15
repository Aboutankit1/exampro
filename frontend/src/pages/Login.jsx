import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiLoader } from "react-icons/fi";
import { login, clearError } from "../redux/slices/authSlice.js";

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const onSubmit = async (formData) => {
    dispatch(clearError());
    const result = await dispatch(login(formData));
    if (login.fulfilled.match(result)) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.error(result.payload || "Login failed");
    }
  };

  return (
    <div className="glass-card p-8 animate-fadeIn">
      <h2 className="font-display text-2xl font-semibold text-slate-100 mb-1">Sign in</h2>
      <p className="text-sm text-muted mb-6">Enter your credentials to access your dashboard.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1.5 block">Email address</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            <input
              type="email"
              placeholder="you@institute.edu"
              className="input-field pl-10"
              {...register("email", { required: "Email is required" })}
            />
          </div>
          {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-xs text-muted mb-1.5 block">Password</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            <input
              type="password"
              placeholder="••••••••"
              className="input-field pl-10"
              {...register("password", { required: "Password is required" })}
            />
          </div>
          {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          <div className="text-right mt-1.5">
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <FiLoader className="animate-spin" size={16} />}
          Sign in
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        New institute?{" "}
        <Link to="/register-institute" className="text-accent hover:underline">
          Register your institute
        </Link>
      </p>
      {/* <p className="text-sm text-muted text-center mt-2">
        Student?{" "}
        <Link to="/register-student" className="text-accent hover:underline">
          Create a student account
        </Link>
      </p> */}

      {/* <div className="mt-6 pt-5 border-t border-white/5 text-xs text-muted">
        <p className="font-medium text-slate-300 mb-1">Demo credentials (after running the seed script):</p>
        <p>superadmin@cbtportal.com / Password123</p>
        <p>admin@everest.edu / Password123</p>
        <p>student1@everest.edu / Password123</p>
      </div> */}
    </div>
  );
};

export default Login;
