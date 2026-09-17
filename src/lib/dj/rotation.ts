export interface RotatableQueueItem {
  id: string;
  tableId: string;
  orderIndex: number;
  createdAt: Date | string;
}

/**
 * Algoritmo de Rotación Justa de Mesas (Fair-Share Round-Robin).
 *
 * Agrupa las canciones pendientes de la cola por mesa (tableId) y las intercala
 * en rondas sucesivas respetando el orden de llegada dentro de cada mesa.
 * Esto evita que una mesa que envió múltiples temas monopolice la pista de baile.
 *
 * @param items Lista de elementos en cola
 * @returns Lista reordenada con nuevos índices consecutivos (1, 2, 3...)
 */
export function calculateFairQueue<T extends RotatableQueueItem>(items: T[]): T[] {
  if (items.length <= 1) return items;

  // 1. Agrupar por mesa, preservando el orden cronológico original dentro de cada grupo
  const tableBuckets = new Map<string, T[]>();

  for (const item of items) {
    const bucket = tableBuckets.get(item.tableId) || [];
    bucket.push(item);
    tableBuckets.set(item.tableId, bucket);
  }

  // 2. Ordenar los buckets por la fecha de la primera canción que pidió cada mesa
  // (la mesa que llegó primero tiene prioridad en la primera ronda)
  const sortedTables = Array.from(tableBuckets.keys()).sort((a, b) => {
    const firstA = new Date(tableBuckets.get(a)![0].createdAt).getTime();
    const firstB = new Date(tableBuckets.get(b)![0].createdAt).getTime();
    return firstA - firstB;
  });

  // 3. Intercalar ronda por ronda (Round-Robin)
  const fairResult: T[] = [];
  let hasMore = true;
  let round = 0;

  while (hasMore) {
    hasMore = false;
    for (const tableId of sortedTables) {
      const bucket = tableBuckets.get(tableId)!;
      if (round < bucket.length) {
        fairResult.push(bucket[round]);
        if (round + 1 < bucket.length) {
          hasMore = true;
        }
      }
    }
    round++;
  }

  // 4. Asignar los nuevos orderIndex normalizados a partir de 1
  return fairResult.map((item, index) => ({
    ...item,
    orderIndex: index + 1,
  }));
}
