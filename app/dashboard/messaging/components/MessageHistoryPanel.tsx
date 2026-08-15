type HistoryItem = {
  id: string;
  phone_number: string;
  message_content: string;
  sent_date: string;
  was_delivered: boolean;
};

export default function MessageHistoryPanel({ history }: { history: HistoryItem[] }) {
  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="font-medium text-ink mb-3">📜 Message History</h2>
      {history.length === 0 ? (
        <p className="text-ink-soft text-sm">No messages sent yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Sent</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t border-cream-deep">
                <td className="px-3 py-2 text-ink-soft">{new Date(h.sent_date).toLocaleString()}</td>
                <td className="px-3 py-2">{h.phone_number}</td>
                <td className="px-3 py-2 text-ink-soft truncate max-w-xs">{h.message_content}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      h.was_delivered ? "bg-green-50 text-green-700" : "bg-red-50 text-red-bright"
                    }`}
                  >
                    {h.was_delivered ? "Delivered" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
