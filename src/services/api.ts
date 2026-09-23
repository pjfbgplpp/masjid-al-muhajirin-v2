import { DisplayConfig } from '../types';
import { DEFAULT_DISPLAYS } from '../data/defaultConfig';
import { generateAndCache12MonthSchedule } from './prayerScheduleCache';
import { performSmartSync, recordSyncCheckResult } from './syncManager';
import {
  getSupabase,
  isSupabaseConfigured,
  ensureSupabaseClient,
  fetchDisplaysFromSupabase,
  fetchSingleDisplayFromSupabase,
  saveAllDisplaysToSupabase,
  saveSingleDisplayToSupabase,
  deleteDisplayFromSupabase,
  subscribeToSupabaseDisplays,
} from './supabase';

export function normalizeDisplayConfig(raw: Partial<DisplayConfig>): DisplayConfig {
  const base = DEFAULT_DISPLAYS[0];
  const merged: DisplayConfig = {
    ...base,
    ...raw,
    location: {
      ...base.location,
      ...(raw?.location || {}),
    },
    prayerAdjustments: {
      ...base.prayerAdjustments,
      ...(raw?.prayerAdjustments || {}),
    },
    prayerModeSettings: {
      ...base.prayerModeSettings,
      ...(raw?.prayerModeSettings || (raw as any)?.prayerMode || {}),
      iqamahCountdownMinutes: {
        ...base.prayerModeSettings.iqamahCountdownMinutes,
        ...(raw?.prayerModeSettings?.iqamahCountdownMinutes || (raw as any)?.prayerMode?.iqamahCountdownMinutes || {}),
      },
    },
    theme: {
      ...base.theme,
      ...(raw?.theme || {}),
    },
    layout: {
      ...base.layout,
      ...(raw?.layout || {}),
    },
    slides: Array.isArray(raw?.slides) ? raw.slides : base.slides,
    announcements: Array.isArray(raw?.announcements) ? raw.announcements : base.announcements,
    runningTexts: Array.isArray(raw?.runningTexts) ? raw.runningTexts : base.runningTexts,
  };
  return merged;
}

// Broadcast channel for real-time multi-tab / multi-screen synchronization within
// the same device/browser (not persisted storage — just a live message bus).
let syncBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncBroadcastChannel = new BroadcastChannel('masjid_tv_sync_channel');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

export function broadcastConfigUpdate(displays: DisplayConfig[]): void {
  try {
    if (syncBroadcastChannel) {
      syncBroadcastChannel.postMessage({
        type: 'DISPLAYS_UPDATED',
        displays,
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    // Ignore channel post error
  }
}

/**
 * Subscribe to live display updates: realtime Supabase push + a lightweight
 * differential poll as a fallback, plus cross-tab broadcast on this device.
 *
 * No IndexedDB/localStorage involved — `getCurrentDisplays` lets the differential
 * poll compare Supabase's updated_at against whatever the caller's own React state
 * currently holds (in-memory, for the lifetime of this tab) instead of a persisted
 * cache, so a changed display still triggers only a minimal fetch rather than a
 * full re-download every tick.
 */
export function subscribeToConfigUpdates(
  callback: (displays: DisplayConfig[]) => void,
  getCurrentDisplays: () => DisplayConfig[]
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'DISPLAYS_UPDATED' && Array.isArray(event.data.displays)) {
      callback(event.data.displays.map(normalizeDisplayConfig));
    }
  };

  if (syncBroadcastChannel) {
    syncBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 1. Real-time Supabase Subscription
  let unsubscribeSupabase = () => {};
  try {
    unsubscribeSupabase = subscribeToSupabaseDisplays(
      (fresh) => {
        if (fresh && fresh.length > 0) {
          callback(fresh);
          recordSyncCheckResult(fresh.length).catch(() => {});
        }
      },
      () => {}
    );
  } catch (err) {
    console.warn('⚠️ [Supabase] Realtime listener error:', err);
  }

  // 2. High-reliability Differential Sync Ticker (Checks only ~100-byte metadata to eliminate egress)
  let lastKnownMetaString = '';
  let isChecking = false;

  const runDifferentialCheck = async () => {
    if (isChecking) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isChecking = true;
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const { data: metaRows, error: metaErr } = await supabase
            .from('displays')
            .select('code, updated_at')
            .order('code', { ascending: true });

          if (!metaErr && metaRows) {
            const currentMetaStr = JSON.stringify(metaRows);
            if (currentMetaStr === lastKnownMetaString) {
              // Exact match: 0 bytes downloaded!
              recordSyncCheckResult(metaRows.length).catch(() => {});
              return;
            }

            // Compare against the caller's current in-memory state
            const knownDisplays = getCurrentDisplays() || [];
            const knownMap = new Map<string, string>();
            for (const d of knownDisplays) {
              knownMap.set(d.code.toUpperCase(), d.updatedAt || '');
            }

            const changedCodes: string[] = [];
            for (const r of metaRows) {
              const rCode = (r.code || '').toUpperCase();
              const knownUpdated = knownMap.get(rCode);
              if (
                !knownUpdated ||
                new Date(r.updated_at).getTime() > new Date(knownUpdated).getTime() + 1000
              ) {
                changedCodes.push(r.code);
              }
            }

            const remoteCodeSet = new Set(metaRows.map((r) => (r.code || '').toUpperCase()));
            const hasDeletedCodes = knownDisplays.some(
              (d) => !remoteCodeSet.has(d.code.toUpperCase())
            );

            if (
              changedCodes.length === 0 &&
              !hasDeletedCodes &&
              knownDisplays.length === metaRows.length
            ) {
              lastKnownMetaString = currentMetaStr;
              recordSyncCheckResult(metaRows.length).catch(() => {});
              return;
            }

            lastKnownMetaString = currentMetaStr;

            // Granular download: If only 1 display was modified, fetch ONLY that display
            if (changedCodes.length === 1 && !hasDeletedCodes) {
              const single = await fetchSingleDisplayFromSupabase(changedCodes[0]);
              if (single) {
                const idx = knownDisplays.findIndex(
                  (d) => d.code.toUpperCase() === single.code.toUpperCase()
                );
                let merged: DisplayConfig[];
                if (idx >= 0) {
                  merged = [...knownDisplays];
                  merged[idx] = single;
                } else {
                  merged = [...knownDisplays, single];
                }
                callback(merged);
                recordSyncCheckResult(merged.length).catch(() => {});
                return;
              }
            }

            // Otherwise, fetch fresh displays list
            const cloudData = await fetchDisplaysFromSupabase();
            if (cloudData && cloudData.length > 0) {
              callback(cloudData);
              recordSyncCheckResult(cloudData.length).catch(() => {});
              return;
            }
          }
        }
      }

      // Fallback to server API if Supabase is not configured
      if (!isSupabaseConfigured()) {
        const res = await fetch('/api/displays', { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map(normalizeDisplayConfig);
            const serialized = JSON.stringify(
              normalized.map((d) => ({ c: d.code, u: d.updatedAt }))
            );
            if (serialized !== lastKnownMetaString) {
              lastKnownMetaString = serialized;
              callback(normalized);
            }
            recordSyncCheckResult(normalized.length).catch(() => {});
          }
        }
      }
    } catch {
      // Ignore background poll errors
    } finally {
      isChecking = false;
    }
  };

  // Event-driven triggers: tab wake-up or network reconnect
  const handleVisibilityOrOnline = () => {
    runDifferentialCheck();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
  }
  window.addEventListener('online', handleVisibilityOrOnline);

  const pollTimer = setInterval(runDifferentialCheck, 35000);

  return () => {
    clearInterval(pollTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    }
    window.removeEventListener('online', handleVisibilityOrOnline);
    if (syncBroadcastChannel) {
      syncBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    try {
      unsubscribeSupabase();
    } catch {}
  };
}

/**
 * Race a promise against a timeout, resolving to `null` if the timeout wins. Used
 * to bound the initial Supabase call below — the Supabase client has no built-in
 * request timeout, and a broken/unreachable network can otherwise leave the
 * browser's own DNS/connection retry behavior in control of how long the TV sits
 * on the loading screen before the server fallback ever gets a chance to run.
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

/**
 * Fetch all displays fresh from the source of truth: Supabase first, then the
 * app's own server (which has its own single shared fallback file, not a
 * per-browser cache), then the bundled generic template as a last resort.
 */
export async function fetchAllDisplays(): Promise<DisplayConfig[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await ensureSupabaseClient();
    if (isSupabaseConfigured()) {
      try {
        const supabaseData = await withTimeout(fetchDisplaysFromSupabase(), 6000);
        if (supabaseData && supabaseData.length > 0) {
          console.log(`✓ [API] Loaded ${supabaseData.length} displays directly from Supabase Cloud`);
          for (const d of supabaseData) {
            generateAndCache12MonthSchedule(d, false).catch(() => {});
          }
          return supabaseData;
        }
      } catch (err) {
        console.warn('⚠️ [Supabase] Initial fetch error:', err);
      }
    }

    // Fallback to the server's own API (server-side shared cache, not per-device)
    try {
      const res = await fetch('/api/displays', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const serverData = await res.json();
        if (Array.isArray(serverData) && serverData.length > 0) {
          const normalizedServer = serverData.map(normalizeDisplayConfig);
          console.log(`✓ [API] Loaded ${normalizedServer.length} displays from Server API`);
          for (const d of normalizedServer) {
            generateAndCache12MonthSchedule(d, false).catch(() => {});
          }
          return normalizedServer;
        }
      }
    } catch (err) {
      console.warn('⚠️ [API] Server fetch warning:', err);
    }
  }

  // Ultimate fallback: bundled generic template (only reached if both Supabase
  // and the server are unreachable, or the browser is offline with nothing else
  // to ask).
  for (const d of DEFAULT_DISPLAYS) {
    generateAndCache12MonthSchedule(d, false).catch(() => {});
  }
  return DEFAULT_DISPLAYS;
}

export async function fetchDisplayByCode(code: string): Promise<DisplayConfig> {
  const cleanCode = (code || 'MASJID-01').trim();

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await ensureSupabaseClient();
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        if (supabase) {
          const result = await withTimeout(
            supabase.from('displays').select('*').ilike('code', cleanCode).maybeSingle(),
            6000
          );
          const { data, error } = result || { data: null, error: null };

          if (!error && data) {
            const item = normalizeDisplayConfig({
              ...(data.data || {}),
              id: data.id || data.data?.id,
              code: (data.code || data.data?.code || cleanCode).trim().toUpperCase(),
              name: data.name || data.data?.name,
              updatedAt: data.updated_at || data.data?.updatedAt || new Date().toISOString(),
            });
            generateAndCache12MonthSchedule(item, false).catch(() => {});
            return item;
          }
        }
      } catch (err) {
        console.warn(`⚠️ [Supabase] Fetch for ${cleanCode} notice:`, err);
      }
    }

    try {
      const res = await fetch(`/api/displays/${encodeURIComponent(cleanCode)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeDisplayConfig(data);
        generateAndCache12MonthSchedule(normalized, false).catch(() => {});
        return normalized;
      }
    } catch {}
  }

  const defaultFound = DEFAULT_DISPLAYS.find(
    (d) => d.code.toLowerCase() === cleanCode.toLowerCase() || d.id === cleanCode
  );
  return normalizeDisplayConfig(defaultFound || DEFAULT_DISPLAYS[0]);
}

export async function saveAllDisplays(displays: DisplayConfig[]): Promise<DisplayConfig[]> {
  const updatedList = displays.map((d) => ({
    ...d,
    updatedAt: new Date().toISOString(),
  }));

  for (const d of updatedList) {
    generateAndCache12MonthSchedule(d, true).catch(() => {});
  }

  // Broadcast to other tabs/screens on this device immediately
  broadcastConfigUpdate(updatedList);

  // Persist to Supabase + server if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await ensureSupabaseClient();
    try {
      const success = await saveAllDisplaysToSupabase(updatedList);
      if (success) {
        console.log(`✓ [API] Synced ${updatedList.length} displays to Supabase table`);
      }
    } catch (err) {
      console.warn('⚠️ [Supabase] Auto-save to Supabase notice:', err);
    }

    try {
      await fetch('/api/displays/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      });
    } catch {}
  }

  return updatedList;
}

export async function saveDisplayConfig(config: DisplayConfig): Promise<DisplayConfig> {
  const updated: DisplayConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  generateAndCache12MonthSchedule(updated, true).catch(() => {});
  broadcastConfigUpdate([updated]);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await ensureSupabaseClient();
    try {
      await saveSingleDisplayToSupabase(updated);
    } catch (err) {
      console.warn('⚠️ [Supabase] Save single display notice:', err);
    }

    try {
      await fetch(`/api/displays/${encodeURIComponent(config.code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}
  }

  return updated;
}

export async function createNewDisplay(newDisplay: Partial<DisplayConfig>): Promise<DisplayConfig> {
  const base = DEFAULT_DISPLAYS[0];
  const cleanName = newDisplay.name || 'Layar TV Masjid';
  const cleanCode = (newDisplay.code || `DISPLAY-${Date.now().toString().slice(-4)}`).toUpperCase().trim();

  const created: DisplayConfig = {
    ...base,
    ...newDisplay,
    name: cleanName,
    id: `display-${Date.now()}`,
    code: cleanCode,
    location: {
      ...base.location,
      ...(newDisplay.location || {}),
      mosqueName: newDisplay.location?.mosqueName || cleanName,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ensureSupabaseClient();
  try {
    await saveSingleDisplayToSupabase(created);
    console.log(`✓ [API] Created & saved display ${created.code} to Supabase`);
  } catch (err) {
    console.warn('⚠️ [Supabase] Create display error:', err);
  }

  try {
    await fetch('/api/displays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    });
  } catch (err) {
    // Ignore
  }

  return created;
}

export async function deleteDisplay(code: string): Promise<boolean> {
  const cleanCode = (code || '').trim().toUpperCase();

  await ensureSupabaseClient();
  try {
    await deleteDisplayFromSupabase(cleanCode);
    console.log(`✓ [API] Deleted display ${cleanCode} from Supabase`);
  } catch (err) {
    console.warn('⚠️ [Supabase] Delete display error:', err);
  }

  try {
    await fetch(`/api/displays/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore
  }

  return true;
}

export async function resetDemoDisplays(): Promise<DisplayConfig[]> {
  try {
    const res = await fetch('/api/displays/reset-demo', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return data.displays || DEFAULT_DISPLAYS;
    }
  } catch (err) {
    console.warn('Reset demo API failed:', err);
  }
  return DEFAULT_DISPLAYS;
}

export const apiService = {
  getAllDisplays: fetchAllDisplays,
  getDisplayByCode: fetchDisplayByCode,
  saveDisplay: saveDisplayConfig,
  saveAllDisplays: saveAllDisplays,
  createDisplay: async (name: string, code: string, copyFromCode?: string) => {
    let base = DEFAULT_DISPLAYS[0];
    if (copyFromCode) {
      const found = await fetchDisplayByCode(copyFromCode);
      if (found) base = found;
    }
    return createNewDisplay({
      ...base,
      name,
      code,
      location: {
        ...base.location,
      },
    });
  },
  deleteDisplay,
  resetDemoDisplays,
};
