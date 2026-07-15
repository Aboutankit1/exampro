import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-ink-800 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-display font-bold text-ink-800">
            E
          </div>
          <span className="font-display text-xl font-semibold text-slate-100">ExamCore</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md"
        >
          <p className="font-mono text-xs text-accent tracking-widest mb-4">SECURE · TIMED · FAIR</p>
          <h1 className="font-display text-4xl font-semibold text-slate-100 leading-tight mb-4">
            Examinations, run with precision.
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            A CBT platform built for institutes that need reliable scheduling, tamper-aware
            proctoring signals, and instant, accurate results.
          </p>
        </motion.div>

        <div className="glass-card p-4 flex items-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-full border-2 border-accent flex items-center justify-center font-mono text-accent text-sm">
            30:00
          </div>
          <div>
            <p className="text-sm text-slate-200 font-medium">Live countdown timer</p>
            <p className="text-xs text-muted">Auto-submits the moment time runs out.</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
