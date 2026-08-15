type Batch = {
  id: string;
  batch_number: string;
  production_date: string;
  total_kg_produced: number;
  status: string;
  notes: string | null;
};

type Output = {
  batch_id: string;
  product_type: string;
  quantity_produced: number;
};

export default function BatchHistory({ batches, outputs }: { batches: Batch[]; outputs: Output[] }) {
  const outputsByBatch = new Map<string, Output[]>();
  for (const o of outputs) {
    const list = outputsByBatch.get(o.batch_id) ?? [];
    list.push(o);
    outputsByBatch.set(o.batch_id, list);
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="font-medium text-ink mb-3">📊 Batch History</h2>
      {batches.length === 0 ? (
        <p className="text-ink-soft text-sm">No batches recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => {
            const batchOutputs = outputsByBatch.get(b.id) ?? [];
            const totalUnits = batchOutputs.reduce((s, o) => s + o.quantity_produced, 0);
            return (
              <div key={b.id} className="border border-cream-deep rounded-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{b.batch_number}</span>
                    <span className="text-ink-soft ml-2 text-sm">{b.production_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-soft text-sm">{b.total_kg_produced?.toFixed(2)} kg produced</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      {b.status}
                    </span>
                  </div>
                </div>
                {batchOutputs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {batchOutputs.map((o, i) => (
                      <span key={i} className="text-xs bg-cream-deep rounded-full px-3 py-1">
                        {o.product_type}: <strong>{o.quantity_produced.toLocaleString()}</strong>
                      </span>
                    ))}
                    <span className="text-xs text-ink-soft px-3 py-1">
                      Total: {totalUnits.toLocaleString()} units
                    </span>
                  </div>
                )}
                {b.notes && <p className="text-xs text-ink-soft mt-2">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
