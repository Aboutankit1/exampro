const StatCard = ({ label, value, icon: Icon, accentColor = "text-accent" }) => (
  <div className="glass-card p-5 flex items-center justify-between hover:border-accent/20 transition-colors">
    <div>
      <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-display font-semibold text-slate-100">{value}</p>
    </div>
    {Icon && (
      <div className={`w-11 h-11 rounded-xl bg-ink-600/60 flex items-center justify-center ${accentColor}`}>
        <Icon size={20} />
      </div>
    )}
  </div>
);

export default StatCard;
