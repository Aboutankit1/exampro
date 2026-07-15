const Settings = () => {
  return (
    <div className="glass-card p-6 max-w-xl">
      <h3 className="font-display font-semibold text-slate-100 mb-2">System settings</h3>
      <p className="text-sm text-muted">
        Global configuration (branding, email templates, subscription pricing) isn't wired up in this build.
        The <code className="text-accent">settings</code> collection referenced in the spec is a natural place
        to extend this — a simple key/value Mongoose model plus a form here would cover most needs.
      </p>
    </div>
  );
};

export default Settings;
