import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="min-h-screen bg-ink-800 flex flex-col items-center justify-center text-center p-6">
    <p className="font-mono text-accent text-sm mb-2">404</p>
    <h1 className="font-display text-2xl font-semibold text-slate-100 mb-3">Page not found</h1>
    <p className="text-muted text-sm mb-6">The page you're looking for doesn't exist or has moved.</p>
    <Link to="/dashboard" className="btn-primary">Back to dashboard</Link>
  </div>
);

export default NotFound;
