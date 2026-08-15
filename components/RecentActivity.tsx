type Activity = { icon: string; text: string; date: string };

export default function RecentActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        Nothing recorded yet — activity will show up here as sales, refills, and restocks happen.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">🕐 Recent Activity</h2>
      <div className="space-y-2">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-cream-deep last:border-0">
            <span className="text-ink">
              {a.icon} {a.text}
            </span>
            <span className="text-ink-soft text-xs">{a.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
