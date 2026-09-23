import { DisplayConfig } from '../types';
import {
  ensureSupabaseClient,
  isSupabaseConfigured,
  fetchDisplaysFromSupabase,
} from './supabase';
import { generateAndCache12MonthSchedule } from './prayerScheduleCache';

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING';

export interface SyncState {
  status: ConnectionStatus;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncTimestamp: number | null;
  lastSyncFormatted: string;
  cachedDisplayCount: number;
  hasPendingChanges: boolean;
  message: string;
}

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

let currentState: SyncState = {
  status: initialOnline ? 'ONLINE' : 'OFFLINE',
  isOnline: initialOnline,
  isSyncing: false,
  lastSyncTime: null,
  lastSyncTimestamp: null,
  lastSyncFormatted: 'Belum pernah sinkron',
  cachedDisplayCount: 0,
  hasPendingChanges: false,
  message: 'Siap',
};

export function formatSyncDate(timestamp: number | null): string {
  if (!timestamp) return 'Belum pernah sinkron';
  const d = new Date(timestamp);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function notifyListeners() {
  currentState.isOnline = currentState.status !== 'OFFLINE';
  currentState.isSyncing = currentState.status === 'SYNCING';
  currentState.lastSyncTime = currentState.lastSyncTimestamp;
  for (const listener of listeners) {
    try {
      listener({ ...currentState });
    } catch (e) {
      console.warn('[SyncManager] Listener error:', e);
    }
  }
}

export function getSyncState(): SyncState {
  currentState.isOnline = currentState.status !== 'OFFLINE';
  currentState.isSyncing = currentState.status === 'SYNCING';
  currentState.lastSyncTime = currentState.lastSyncTimestamp;
  return { ...currentState };
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  currentState.isOnline = currentState.status !== 'OFFLINE';
  currentState.isSyncing = currentState.status === 'SYNCING';
  currentState.lastSyncTime = currentState.lastSyncTimestamp;
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function updateSyncStatus(status: ConnectionStatus, message?: string) {
  currentState.status = status;
  if (message) currentState.message = message;
  notifyListeners();
}

/**
 * Initialize Sync Manager - loads last saved metadata and wires up online/offline
 * status tracking.
 *
 * This does NOT run its own polling loop or its own visibilitychange/online-triggered
 * fetch anymore — api.ts's subscribeToConfigUpdates() already listens for the same
 * `online`/`visibilitychange` events and runs its own poll (plus a realtime
 * subscription), and previously both systems fired independently on every one of
 * those triggers. Instead, that single surviving check now calls
 * recordSyncCheckResult() below to keep this module's status (used for the TV/admin
 * "last synced" badge) fresh, so there's one source of truth instead of two parallel
 * differential-sync implementations racing each other.
 */
export async function initSyncManager(): Promise<void> {
  if (typeof window === 'undefined') return;

  // The browser already tells us this for free (no network round-trip needed), so
  // the status flips instantly. The actual re-sync on reconnect is api.ts's job.
  const handleOnline = () => {
    currentState.status = 'ONLINE';
    currentState.message = 'Koneksi internet terhubung';
    notifyListeners();
  };

  const handleOffline = () => {
    console.log('⚠️ [SyncManager] Network offline detected. Switching to local offline mode.');
    currentState.status = 'OFFLINE';
    currentState.message = 'Mode Offline (Menggunakan Data Lokal)';
    notifyListeners();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

/**
 * Called by api.ts's differential-check loop (and its realtime callback) after it
 * completes a check or applies an update — whether or not that check found changes —
 * so the sync status badge stays fresh without this module running its own duplicate
 * poll/event listeners.
 */
export async function recordSyncCheckResult(displayCount: number): Promise<void> {
  const now = Date.now();
  currentState.status = 'ONLINE';
  currentState.lastSyncTimestamp = now;
  currentState.lastSyncFormatted = formatSyncDate(now);
  currentState.cachedDisplayCount = displayCount;
  currentState.message = 'Sinkron • Data lokal sudah yang terbaru';
  notifyListeners();
}

// Background sync lock
let isSyncInProgress = false;

// Signature of the rows from the last successful full download. The UI may refuse to
// apply fresh data (admin has unsaved edits), leaving the caller's copy on an older
// updatedAt — without this guard the same payload is re-downloaded on every poll.
let lastDownloadedRemoteSignature: string | null = null;

function buildRemoteSignature(rows: { code: unknown; updated_at: unknown }[]): string {
  return rows
    .map((r) => `${String(r.code).toUpperCase()}@${String(r.updated_at)}`)
    .sort()
    .join('|');
}
let globalDisplaysProvider: (() => DisplayConfig[]) | null = null;
let globalDisplaysConsumer: ((displays: DisplayConfig[]) => void) | null = null;

export function registerSyncHandlers(
  getDisplays: () => DisplayConfig[],
  setDisplays: (displays: DisplayConfig[]) => void
) {
  globalDisplaysProvider = getDisplays;
  globalDisplaysConsumer = setDisplays;
}

export async function triggerBackgroundSync(displays?: DisplayConfig[]): Promise<void> {
  if (isSyncInProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentState.status = 'OFFLINE';
    currentState.message = 'Mode Offline (Menggunakan Data Lokal)';
    notifyListeners();
    return;
  }

  const currentDisplays = displays || (globalDisplaysProvider ? globalDisplaysProvider() : []);
  if (currentDisplays && currentDisplays.length > 0) {
    await performSmartSync(currentDisplays, globalDisplaysConsumer || undefined);
  }
}

/**
 * Smart Differential Sync with Supabase:
 * 1. Checks if Supabase has changed by inspecting updated_at (ultra-lightweight query)
 * 2. If no change, updates lastSyncTimestamp with 0 data re-download
 * 3. If changed, fetches only what is necessary and pre-warms the prayer schedule cache
 * 4. On any failure: keeps whatever the caller already has in memory (`localDisplays`)
 *    and falls back to the server's own API/cache — nothing is ever cleared.
 */
export async function performSmartSync(
  localDisplays: DisplayConfig[],
  onUpdateDisplays?: (updated: DisplayConfig[]) => void
): Promise<DisplayConfig[]> {
  if (isSyncInProgress) return localDisplays;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentState.status = 'OFFLINE';
    currentState.message = 'Mode Offline (Menggunakan Data Lokal)';
    notifyListeners();
    return localDisplays;
  }

  isSyncInProgress = true;
  currentState.status = 'SYNCING';
  currentState.message = 'Memeriksa perubahan di Supabase...';
  notifyListeners();

  try {
    const supabase = await ensureSupabaseClient();

    if (!supabase || !isSupabaseConfigured()) {
      // Fall back to local server /api/displays
      try {
        const res = await fetch('/api/displays', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const serverData = await res.json();
          if (Array.isArray(serverData) && serverData.length > 0) {
            await handleSuccessfulSync(serverData, onUpdateDisplays);
            return serverData;
          }
        }
      } catch {}

      // Keep existing local data
      currentState.status = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      currentState.message = 'Siap (Data lokal aktif)';
      notifyListeners();
      return localDisplays;
    }

    // 1. Ultra-lightweight check: Select only code and updated_at
    const { data: metaRows, error: metaErr } = await supabase
      .from('displays')
      .select('code, updated_at')
      .order('code', { ascending: true });

    if (metaErr) {
      console.warn('⚠️ [SyncManager] Metadata check notice:', metaErr.message);
      currentState.status = 'OFFLINE';
      currentState.message = 'Gagal menghubungi Supabase, menggunakan data lokal';
      notifyListeners();
      return localDisplays;
    }

    if (!metaRows || metaRows.length === 0) {
      // Supabase is empty, preserve local displays
      currentState.status = 'ONLINE';
      currentState.message = 'Terkoneksi ke Supabase';
      notifyListeners();
      return localDisplays;
    }

    // 2. Compare timestamps with local displays
    const remoteSignature = buildRemoteSignature(metaRows);
    let hasRemoteChanges = false;
    if (remoteSignature === lastDownloadedRemoteSignature) {
      hasRemoteChanges = false;
    } else if (metaRows.length !== localDisplays.length) {
      hasRemoteChanges = true;
    } else {
      for (const remote of metaRows) {
        const local = localDisplays.find(
          (d) => d.code.toUpperCase() === String(remote.code).toUpperCase()
        );
        if (!local) {
          hasRemoteChanges = true;
          break;
        }
        const remoteTime = new Date(remote.updated_at || 0).getTime();
        const localTime = new Date(local.updatedAt || 0).getTime();
        // If remote is newer by more than 1 second
        if (remoteTime > localTime + 1000) {
          hasRemoteChanges = true;
          break;
        }
      }
    }

    // 3. If no changes, skip full payload download!
    if (!hasRemoteChanges) {
      const now = Date.now();
      currentState.status = 'ONLINE';
      currentState.lastSyncTimestamp = now;
      currentState.lastSyncFormatted = formatSyncDate(now);
      currentState.cachedDisplayCount = localDisplays.length;
      currentState.message = 'Sinkron • Data lokal sudah yang terbaru';
      notifyListeners();
      return localDisplays;
    }

    // 4. Remote has changes: Download full rows
    currentState.message = 'Mengunduh data display terbaru...';
    notifyListeners();

    const fullRemote = await fetchDisplaysFromSupabase();
    if (fullRemote && fullRemote.length > 0) {
      lastDownloadedRemoteSignature = remoteSignature;
      await handleSuccessfulSync(fullRemote, onUpdateDisplays);
      return fullRemote;
    }

    return localDisplays;
  } catch (err: any) {
    console.warn('⚠️ [SyncManager] Sync exception notice:', err?.message || err);
    currentState.status = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    currentState.message = 'Menggunakan data lokal yang tersimpan';
    notifyListeners();
    return localDisplays;
  } finally {
    isSyncInProgress = false;
  }
}

async function handleSuccessfulSync(
  freshDisplays: DisplayConfig[],
  onUpdateDisplays?: (updated: DisplayConfig[]) => void
) {
  const now = Date.now();

  // Pre-generate 12-month prayer schedule in the in-memory cache
  for (const d of freshDisplays) {
    generateAndCache12MonthSchedule(d, false).catch(() => {});
  }

  currentState.status = 'ONLINE';
  currentState.lastSyncTimestamp = now;
  currentState.lastSyncFormatted = formatSyncDate(now);
  currentState.cachedDisplayCount = freshDisplays.length;
  currentState.message = 'Sinkronisasi berhasil • Data tersimpan di memori TV';
  notifyListeners();

  if (onUpdateDisplays) {
    onUpdateDisplays(freshDisplays);
  }
}
