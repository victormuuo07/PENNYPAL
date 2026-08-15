export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="text-4xl mb-2 animate-pulse">🌶️</div>
        <div className="text-sm text-ink-soft">Loading your dashboard…</div>
      </div>
    </div>
  );
}
