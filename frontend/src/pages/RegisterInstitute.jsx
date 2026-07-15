import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiLoader, FiClock, FiCheckCircle } from "react-icons/fi";
import { registerInstitute, clearError } from "../redux/slices/authSlice.js";

const RegisterInstitute = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null); // holds { instituteName } once registration succeeds

  const onSubmit = async (formData) => {
    dispatch(clearError());
    setLoading(true);
    const result = await dispatch(registerInstitute(formData));
    setLoading(false);
    if (registerInstitute.fulfilled.match(result)) {
      setSubmitted({ instituteName: formData.instituteName });
      toast.success("Registration submitted!");
    } else {
      toast.error(result.payload || "Registration failed");
    }
  };

  if (submitted) {
    return (
      <div className="glass-card p-8 animate-fadeIn text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-warning/15 text-warning flex items-center justify-center mb-4">
          <FiClock size={26} />
        </div>
        <h2 className="font-display text-xl font-semibold text-slate-100 mb-2">Pending approval</h2>
        <p className="text-sm text-muted mb-6">
          Thanks! <span className="text-slate-200">{submitted.instituteName}</span> has been submitted and is
          waiting for review by our team. You'll be able to sign in as soon as it's approved — we'll notify the
          admin email you provided.
        </p>
        <div className="flex items-center gap-2 justify-center text-xs text-muted mb-6">
          <FiCheckCircle className="text-success" size={14} /> No further action needed from you right now
        </div>
        <Link to="/login" className="btn-secondary inline-block">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 animate-fadeIn">
      <h2 className="font-display text-2xl font-semibold text-slate-100 mb-1">Register your institute</h2>
      <p className="text-sm text-muted mb-6">
        Submit your details to create an institute admin account. A member of our team reviews and approves new
        institutes before they go live.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1.5 block">Institute name</label>
          <input className="input-field" placeholder="Everest Learning Institute" {...register("instituteName", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Institute code (unique, used by students to join)</label>
          <input className="input-field uppercase" placeholder="EVEREST" {...register("instituteCode", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Admin full name</label>
          <input className="input-field" placeholder="Jane Doe" {...register("adminName", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Admin email</label>
          <input type="email" className="input-field" placeholder="admin@institute.edu" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="Minimum 6 characters"
            {...register("password", { required: true, minLength: 6 })}
          />
          {errors.password && <p className="text-danger text-xs mt-1">Password must be at least 6 characters</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <FiLoader className="animate-spin" size={16} />}
          Submit for approval
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

export default RegisterInstitute;
