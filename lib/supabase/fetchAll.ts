import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase/PostgREST caps a single query at 1000 rows by default. A plain
 * .select() on a table that's grown past that doesn't error — it just
 * silently returns only part of the data, which is exactly the kind of
 * bug that's invisible until someone notices old records "missing". This
 * pages through in batches of 1000 until everything's actually fetched.
 */
export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  orderColumn: string
): Promise<T[]> {
  const pageSize = 1000;
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1);

    if (error || !data) break;
    allRows = allRows.concat(data as T[]);
    if (data.length < pageSize) break; // fewer than a full page means we've reached the end
    from += pageSize;
  }

  return allRows;
}
