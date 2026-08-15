type TeamMember = {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  SALES_PEOPLE: { full_name: string; phone: string; commission_rate: number; status: string }[] | null;
};

export default function TeamList({ team }: { team: TeamMember[] }) {
  if (team.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No accounts yet — you should be the first (create your own owner account above if you haven&apos;t).
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-deep text-ink-soft text-left">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium text-right">Commission</th>
          </tr>
        </thead>
        <tbody>
          {team.map((t) => (
            <tr key={t.id} className="border-t border-cream-deep">
              <td className="px-4 py-3">{t.full_name}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.role === "owner" ? "bg-gold/10 text-gold-dark" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {t.role === "owner" ? "🔑 Owner" : "🤝 Sales Rep"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft">{t.SALES_PEOPLE?.[0]?.phone ?? "—"}</td>
              <td className="px-4 py-3 text-right text-ink-soft">
                {t.SALES_PEOPLE?.[0] ? `${t.SALES_PEOPLE[0].commission_rate}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
