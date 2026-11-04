/**
 * Motor de Resiliencia y Modo Sin Conexión (Offline Engine) para Control de Acceso
 * Utiliza IndexedDB en el navegador para validación local rápida en situaciones de corte de red.
 */

const DB_NAME = "vidjs_accreditation_offline_v1";
const DB_VERSION = 1;

const STORES = {
  PACKS: "events_pack",
  QUEUE: "offline_scans",
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no está soportado en este entorno"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.PACKS)) {
        db.createObjectStore(STORES.PACKS, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, {
          keyPath: "id",
          autoIncrement: true,
        });
        queueStore.createIndex("eventId", "eventId", { unique: false });
        queueStore.createIndex("qrToken", "qrToken", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflinePackData {
  eventId: string;
  eventName: string;
  eventCode: string;
  downloadedAt: string;
  categories: any[];
  accessPoints: any[];
  accreditationsMap: Record<string, any>;
  totalTickets: number;
}

export interface OfflineScanRecord {
  id?: number;
  localId?: string;
  eventId: string;
  qrToken: string;
  accessPointId?: string | null;
  direction: "IN" | "OUT";
  scannedAt: string;
  status: "APPROVED" | "REJECTED" | "DUPLICATE";
  rejectionReason?: string;
  participantSnapshot?: any;
}

/**
 * Descarga y almacena en IndexedDB el paquete de acreditaciones autorizadas para el evento
 */
export async function downloadEventOfflinePack(eventId: string): Promise<OfflinePackData> {
  const res = await fetch(`/api/v1/accreditation/events/${eventId}/offline-pack`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al descargar paquete offline");
  }

  const json = await res.json();
  const pack = json.pack;

  // Index accreditations by qrToken for instant O(1) lookups
  const accreditationsMap: Record<string, any> = {};
  for (const acc of pack.accreditations) {
    accreditationsMap[acc.qrToken] = acc;
  }

  const packData: OfflinePackData = {
    eventId: pack.eventId,
    eventName: pack.eventName,
    eventCode: pack.eventCode,
    downloadedAt: pack.downloadedAt,
    categories: pack.categories,
    accessPoints: pack.accessPoints,
    accreditationsMap,
    totalTickets: pack.accreditations.length,
  };

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.PACKS], "readwrite");
    const store = tx.objectStore(STORES.PACKS);
    store.put(packData);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return packData;
}

/**
 * Verifica si un evento ya fue descargado localmente
 */
export async function isEventCachedOffline(
  eventId: string
): Promise<{ cached: boolean; downloadedAt?: string; totalTickets?: number }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.PACKS], "readonly");
      const store = tx.objectStore(STORES.PACKS);
      const req = store.get(eventId);

      req.onsuccess = () => {
        if (req.result) {
          resolve({
            cached: true,
            downloadedAt: req.result.downloadedAt,
            totalTickets: req.result.totalTickets,
          });
        } else {
          resolve({ cached: false });
        }
      };
      req.onerror = () => resolve({ cached: false });
    });
  } catch {
    return { cached: false };
  }
}

/**
 * Valida un código QR 100% en local sin internet
 */
export async function checkInOffline(
  eventId: string,
  qrToken: string,
  accessPointId?: string
): Promise<{
  success: boolean;
  status: "APPROVED" | "REJECTED" | "DUPLICATE";
  message: string;
  participant?: any;
  rejectionReason?: string;
}> {
  const db = await openDatabase();

  // 1. Obtener paquete del evento
  const pack: OfflinePackData | null = await new Promise((resolve) => {
    const tx = db.transaction([STORES.PACKS], "readonly");
    const store = tx.objectStore(STORES.PACKS);
    const req = store.get(eventId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  if (!pack) {
    return {
      success: false,
      status: "REJECTED",
      rejectionReason: "NO_OFFLINE_PACK",
      message: "No hay datos locales descargados para este evento. Descarga el paquete offline previamente.",
    };
  }

  // 2. Buscar acreditación por token QR
  const accreditation = pack.accreditationsMap[qrToken];
  if (!accreditation) {
    return {
      success: false,
      status: "REJECTED",
      rejectionReason: "INVALID_QR",
      message: "Código QR inexistente o no reconocido en la base local",
    };
  }

  const { participant } = accreditation;
  const category = pack.categories.find((c) => c.id === accreditation.accreditationTypeId);

  // 3. Verificar estado bloqueado / cancelado
  if (accreditation.status === "BLOCKED" || accreditation.status === "CANCELLED") {
    return {
      success: false,
      status: "REJECTED",
      rejectionReason: accreditation.status,
      message: `Credencial denegada: Estado ${accreditation.status}`,
      participant,
    };
  }

  // 4. Verificar matriz de puertas si hay accessPointId seleccionado
  if (accessPointId) {
    const door = pack.accessPoints.find((p) => p.id === accessPointId);
    if (door && door.rules) {
      const rule = door.rules.find((r: any) => r.accreditationTypeId === category?.id);
      if (rule && rule.isAllowed === false) {
        return {
          success: false,
          status: "REJECTED",
          rejectionReason: "INVALID_SECTOR",
          message: `Sector restringido: La categoría "${category?.name || ""}" no puede ingresar por esta puerta`,
          participant,
        };
      }
    }
  }

  // 5. Verificar reingreso y duplicados locales
  const existingLocalScans: OfflineScanRecord[] = await new Promise((resolve) => {
    const tx = db.transaction([STORES.QUEUE], "readonly");
    const store = tx.objectStore(STORES.QUEUE);
    const req = store.getAll();
    req.onsuccess = () => {
      const records: OfflineScanRecord[] = req.result || [];
      resolve(records.filter((r) => r.eventId === eventId && r.qrToken === qrToken && r.status === "APPROVED"));
    };
    req.onerror = () => resolve([]);
  });

  const totalCheckInsPrior = (accreditation.totalCheckIns || 0) + existingLocalScans.length;

  if (category && !category.allowReentry && totalCheckInsPrior > 0) {
    const duplicateRecord: OfflineScanRecord = {
      eventId,
      qrToken,
      accessPointId: accessPointId || null,
      direction: "IN",
      scannedAt: new Date().toISOString(),
      status: "DUPLICATE",
      rejectionReason: "ALREADY_CHECKED_IN",
      participantSnapshot: participant,
    };

    await saveScanRecord(db, duplicateRecord);

    return {
      success: false,
      status: "DUPLICATE",
      rejectionReason: "ALREADY_CHECKED_IN",
      message: "¡ATENCIÓN! El participante ya ingresó previamente (No permite reingreso)",
      participant: {
        ...participant,
        category: category?.name,
        colorHex: category?.colorHex,
        codeNumber: accreditation.codeNumber,
        totalCheckIns: totalCheckInsPrior,
      },
    };
  }

  // 6. Acceso Válido Offline
  const approvedRecord: OfflineScanRecord = {
    eventId,
    qrToken,
    accessPointId: accessPointId || null,
    direction: "IN",
    scannedAt: new Date().toISOString(),
    status: "APPROVED",
    participantSnapshot: participant,
  };

  await saveScanRecord(db, approvedRecord);

  return {
    success: true,
    status: "APPROVED",
    message: "Acceso autorizado (Modo Offline registrado)",
    participant: {
      ...participant,
      category: category?.name,
      categoryCode: category?.code,
      colorHex: category?.colorHex,
      codeNumber: accreditation.codeNumber,
      totalCheckIns: totalCheckInsPrior + 1,
    },
  };
}

function saveScanRecord(db: IDBDatabase, record: OfflineScanRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.QUEUE], "readwrite");
    const store = tx.objectStore(STORES.QUEUE);
    store.add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retorna la cantidad de registros escaneados pendientes de sincronizar
 */
export async function getOfflinePendingCount(eventId: string): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.QUEUE], "readonly");
      const store = tx.objectStore(STORES.QUEUE);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: OfflineScanRecord[] = req.result || [];
        resolve(list.filter((r) => r.eventId === eventId).length);
      };
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Sincroniza la cola local de registros offline con el servidor central
 */
export async function syncOfflineQueue(
  eventId: string
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  const db = await openDatabase();

  const allRecords: OfflineScanRecord[] = await new Promise((resolve) => {
    const tx = db.transaction([STORES.QUEUE], "readonly");
    const store = tx.objectStore(STORES.QUEUE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const eventRecords = allRecords.filter((r) => r.eventId === eventId);
  if (eventRecords.length === 0) {
    return { success: true, syncedCount: 0, message: "No hay registros pendientes" };
  }

  const payload = {
    eventId,
    records: eventRecords.map((r) => ({
      localId: String(r.id),
      qrToken: r.qrToken,
      accessPointId: r.accessPointId,
      direction: r.direction,
      scannedAt: r.scannedAt,
    })),
  };

  const res = await fetch("/api/v1/accreditation/checkin/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al sincronizar con el servidor");
  }

  const json = await res.json();

  // Clear synced records from local store
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.QUEUE], "readwrite");
    const store = tx.objectStore(STORES.QUEUE);
    for (const r of eventRecords) {
      if (r.id !== undefined) {
        store.delete(r.id);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    success: true,
    syncedCount: json.approvedCount + (json.duplicateCount || 0),
    message: `Sincronizados ${json.approvedCount} ingresos con éxito`,
  };
}
