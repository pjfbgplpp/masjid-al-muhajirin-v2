import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { DisplayConfig } from '../types';
import { normalizeDisplayConfig } from './api';
import { loadDisplaysFromDb } from './storageDb';
import {
  buildDisplayDataColumn,
  assembleDisplayConfig,
  saveDisplayChildren,
  DISPLAY_SELECT_WITH_CHILDREN,
  SlideRow,
  AnnouncementRow,
  RunningTextRow,
} from './displayRowMapper';

const LOCAL_STORAGE_SUPABASE_URL = 'masjid_tv_supabase_url';
const LOCAL_STORAGE_SUPABASE_KEY = 'masjid_tv_supabase_anon_key';

// Helper to get environment variables safely
const getEnvVar = (key: string): string => {
  const metaEnv = (import.meta as any)?.env;
  if (metaEnv && metaEnv[key]) {
    return String(metaEnv[key]).trim();
  }
  return '';
};

export interface SupabaseConfigCredentials {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

let serverApiConfigPromise: Promise<SupabaseConfigCredentials | null> | null = null;
let cachedServerApiConfig: SupabaseConfigCredentials | null = null;

/**
 * Auto-fetch Supabase configuration from server environment
 */
export async function fetchServerSupabaseConfig(): Promise<SupabaseConfigCredentials | null> {
  if (cachedServerApiConfig && cachedServerApiConfig.url) {
    return cachedServerApiConfig;
  }
  if (typeof window === 'undefined') return null;

  if (!serverApiConfigPromise) {
    serverApiConfigPromise = fetch('/api/supabase/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.configured && data.url && data.anonKey) {
          cachedServerApiConfig = {
            url: data.url,
            anonKey: data.anonKey,
            source: 'env',
          };
          try {
            if (!localStorage.getItem(LOCAL_STORAGE_SUPABASE_URL)) {
              localStorage.setItem(LOCAL_STORAGE_SUPABASE_URL, data.url);
              localStorage.setItem(LOCAL_STORAGE_SUPABASE_KEY, data.anonKey);
            }
          } catch {}
          return cachedServerApiConfig;
        }
        return null;
      })
      .catch((e) => {
        console.warn('[Supabase] Auto-config fetch notice:', e);
        return null;
      });
  }
  return serverApiConfigPromise;
}

/**
 * Get active Supabase configuration (prefers custom local config, then cached server config, then env vars)
 */
export function getSupabaseCredentials(): SupabaseConfigCredentials {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(LOCAL_STORAGE_SUPABASE_URL)?.trim() || '';
    const customKey = localStorage.getItem(LOCAL_STORAGE_SUPABASE_KEY)?.trim() || '';
    if (customUrl && customKey && customUrl.startsWith('http')) {
      return { url: customUrl, anonKey: customKey, source: 'custom' };
    }
  }

  if (cachedServerApiConfig && cachedServerApiConfig.url && cachedServerApiConfig.anonKey) {
    return cachedServerApiConfig;
  }

  const envUrl = getEnvVar('VITE_SUPABASE_URL');
  const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (envUrl && envKey && envUrl.startsWith('http') && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  return { url: '', anonKey: '', source: 'none' };
}

export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.anonKey && creds.url.startsWith('http'));
}

export async function ensureSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    await fetchServerSupabaseConfig();
  }
  return getSupabase();
}

let clientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabase(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds.url || !creds.anonKey) return null;

  if (clientInstance && currentClientUrl === creds.url && currentClientKey === creds.anonKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(creds.url, creds.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentClientUrl = creds.url;
    currentClientKey = creds.anonKey;
    console.log('⚡ [Supabase] Client initialized successfully for', creds.url);
    return clientInstance;
  } catch (err) {
    console.error('❌ [Supabase] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Save manual credentials in browser localStorage
 */
export function setCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl && !cleanKey) {
    localStorage.removeItem(LOCAL_STORAGE_SUPABASE_URL);
    localStorage.removeItem(LOCAL_STORAGE_SUPABASE_KEY);
  } else {
    localStorage.setItem(LOCAL_STORAGE_SUPABASE_URL, cleanUrl);
    localStorage.setItem(LOCAL_STORAGE_SUPABASE_KEY, cleanKey);
  }

  // Reset client so it re-initializes on next call
  clientInstance = null;
  currentClientUrl = '';
  currentClientKey = '';
}

export interface SupabaseRow {
  id: string;
  code: string;
  name: string;
  data: any;
  created_at?: string;
  updated_at?: string;
  // Present only when the row was fetched with nested embeds
  // (select=*,slides(*),announcements(*),running_texts(*)).
  slides?: SlideRow[];
  announcements?: AnnouncementRow[];
  running_texts?: RunningTextRow[];
}

/**
 * Format DisplayConfig into Supabase row format. Only the 1:1 config fields
 * (theme, layout, location, ...) go into `data` — slides/announcements/
 * runningTexts live in their own tables and are written separately by
 * syncChildRows (see saveSingleDisplayToSupabase / saveAllDisplaysToSupabase).
 */
export function formatDisplayForSupabase(display: DisplayConfig): SupabaseRow {
  const cleanCode = (display.code || 'MASJID-01').trim().toUpperCase();
  const id = display.id || `display-${cleanCode.toLowerCase()}`;
  const now = new Date().toISOString();

  return {
    id,
    code: cleanCode,
    name: display.name || 'Masjid Utama',
    data: JSON.parse(JSON.stringify(buildDisplayDataColumn(display))),
    created_at: display.createdAt || now,
    updated_at: display.updatedAt || now,
  };
}

/**
 * Convert a Supabase row (optionally with nested slides/announcements/
 * running_texts embeds) back to a full DisplayConfig.
 */
export function parseSupabaseRow(row: SupabaseRow): DisplayConfig {
  const assembled = assembleDisplayConfig(
    row,
    row.slides || [],
    row.announcements || [],
    row.running_texts || []
  );
  return normalizeDisplayConfig(assembled);
}

/**
 * Test connectivity to Supabase
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; count?: number }> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Kredensial Supabase belum diisi. Masukkan URL dan Anon Key Supabase Anda.',
    };
  }

  try {
    const { data, error, count } = await supabase
      .from('displays')
      .select('id, code, name', { count: 'exact', head: false })
      .limit(10);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "public.displays" does not exist')) {
        return {
          ok: false,
          message: 'Tabel "displays" belum ada di Supabase. Silakan salin dan jalankan skema SQL di Supabase SQL Editor.',
        };
      }
      return {
        ok: false,
        message: `Error koneksi Supabase: ${error.message} (Kode: ${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      ok: true,
      message: `Terkoneksi dengan sukses ke Supabase! Ditemukan ${data?.length || 0} display tersimpan.`,
      count: count ?? data?.length ?? 0,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Gagal menghubungi Supabase: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Fetch all displays from Supabase table `displays`
 */
export async function fetchDisplaysFromSupabase(): Promise<DisplayConfig[] | null> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('displays')
      .select(DISPLAY_SELECT_WITH_CHILDREN)
      .order('code', { ascending: true });

    if (error) {
      console.warn('⚠️ [Supabase] Fetch error:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return (data as unknown as SupabaseRow[]).map(parseSupabaseRow);
    }
    return [];
  } catch (err) {
    console.error('❌ [Supabase] Fetch exception:', err);
    return null;
  }
}

/**
 * Fetch only a SINGLE display by code (saves egress when only one display changed)
 */
export async function fetchSingleDisplayFromSupabase(code: string): Promise<DisplayConfig | null> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanCode = (code || 'MASJID-01').trim().toUpperCase();
    const { data, error } = await supabase
      .from('displays')
      .select(DISPLAY_SELECT_WITH_CHILDREN)
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !data) return null;
    return parseSupabaseRow(data as unknown as SupabaseRow);
  } catch (err) {
    console.warn('⚠️ [Supabase] Single fetch exception:', err);
    return null;
  }
}

/**
 * Save / Upsert single display to Supabase
 */
export async function saveSingleDisplayToSupabase(display: DisplayConfig): Promise<boolean> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return false;

  try {
    const row = formatDisplayForSupabase(display);
    const { error } = await supabase
      .from('displays')
      .upsert(row, { onConflict: 'code' });

    if (error) {
      console.error('❌ [Supabase] Upsert single display error:', error.message);
      return false;
    }

    await saveDisplayChildren(supabase, display, row.id);

    console.log(`✓ [Supabase] Display "${display.code}" berhasil disimpan ke Supabase.`);
    return true;
  } catch (err) {
    console.error('❌ [Supabase] Upsert single display exception:', err);
    return false;
  }
}

/**
 * Save / Upsert array of displays to Supabase
 */
export async function saveAllDisplaysToSupabase(displays: DisplayConfig[]): Promise<boolean> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return false;

  try {
    const rows = displays.map(formatDisplayForSupabase);
    const { error } = await supabase
      .from('displays')
      .upsert(rows, { onConflict: 'code' });

    if (error) {
      console.error('❌ [Supabase] Upsert bulk displays error:', error.message);
      return false;
    }

    await Promise.all(
      displays.map((display, i) => saveDisplayChildren(supabase, display, rows[i].id))
    );

    console.log(`✓ [Supabase] ${displays.length} displays berhasil disinkronkan ke Supabase.`);
    return true;
  } catch (err) {
    console.error('❌ [Supabase] Upsert bulk displays exception:', err);
    return false;
  }
}

/**
 * Delete display by code from Supabase
 */
export async function deleteDisplayFromSupabase(code: string): Promise<boolean> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanCode = code.trim().toUpperCase();
    const { error } = await supabase
      .from('displays')
      .delete()
      .eq('code', cleanCode);

    if (error) {
      console.error('❌ [Supabase] Delete display error:', error.message);
      return false;
    }
    console.log(`✓ [Supabase] Display "${cleanCode}" berhasil dihapus dari Supabase.`);
    return true;
  } catch (err) {
    console.error('❌ [Supabase] Delete display exception:', err);
    return false;
  }
}

/**
 * Realtime Subscription for Postgres Changes on `displays` table (INSERT/UPDATE re-fetch
 * the single display with its slides/announcements/running_texts joins; DELETE stays
 * zero-HTTP since it only needs the code/id already in the payload)
 */
export function subscribeToSupabaseDisplays(
  onUpdate: (displays: DisplayConfig[]) => void,
  onStatusChange?: (status: string) => void
): () => void {
  let isCancelled = false;
  let activeChannel: RealtimeChannel | null = null;
  let clientUsed: SupabaseClient | null = null;

  ensureSupabaseClient().then((supabase) => {
    if (isCancelled || !supabase) return;
    clientUsed = supabase;
    try {
      activeChannel = supabase
        .channel('masjid_displays_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'displays' },
          async (payload) => {
            console.log('⚡ [Supabase Realtime] Event detected:', payload.eventType);

            try {
              const newRow = payload.new as SupabaseRow | undefined;
              const oldRow = payload.old as SupabaseRow | undefined;

              // 1. Zero-HTTP Delete handler: the row itself carries everything needed
              //    (code/id), no join required, so this can stay a local-only filter.
              if (payload.eventType === 'DELETE' && oldRow) {
                const targetCode = (oldRow.code || '').trim().toUpperCase();
                const localDisplays = (await loadDisplaysFromDb()) || [];
                const filtered = localDisplays.filter(
                  (d) => d.code.toUpperCase() !== targetCode && d.id !== oldRow.id
                );
                console.log(`⚡ [Supabase Realtime] Applied zero-HTTP deletion for ${targetCode || oldRow.id}`);
                onUpdate(filtered);
                return;
              }

              // 2. INSERT/UPDATE: the payload's `new` never carries joined slides/
              //    announcements/running_texts (Postgres replication only sends the
              //    row's own columns), and those fields also touch this same
              //    "displays" row via the touch_display_updated_at trigger without
              //    changing `data` at all. So a single fresh fetch with joins is
              //    required here — it can't be reconstructed from the payload alone.
              const targetCode = (newRow?.code || '').trim().toUpperCase();
              if (targetCode) {
                const single = await fetchSingleDisplayFromSupabase(targetCode);
                if (single) {
                  const localDisplays = (await loadDisplaysFromDb()) || [];
                  const idx = localDisplays.findIndex(
                    (d) => d.code.toUpperCase() === single.code.toUpperCase()
                  );
                  let merged: DisplayConfig[];
                  if (idx >= 0) {
                    merged = [...localDisplays];
                    merged[idx] = single;
                  } else {
                    merged = [...localDisplays, single];
                  }
                  console.log(`⚡ [Supabase Realtime] Applied single-item fetch for ${targetCode}`);
                  onUpdate(merged);
                  return;
                }
              }

              // 3. Absolute fallback: Fetch full list if all else fails
              const fresh = await fetchDisplaysFromSupabase();
              if (fresh && fresh.length > 0) {
                onUpdate(fresh);
              }
            } catch (err) {
              console.warn('⚠️ [Supabase Realtime] Event handler fallback:', err);
              const fresh = await fetchDisplaysFromSupabase();
              if (fresh && fresh.length > 0) {
                onUpdate(fresh);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('⚡ [Supabase Realtime] Channel status:', status);
          if (onStatusChange) {
            onStatusChange(status);
          }
        });
    } catch (err) {
      console.warn('⚠️ [Supabase Realtime] Subscription error:', err);
    }
  });

  return () => {
    isCancelled = true;
    if (activeChannel && clientUsed) {
      clientUsed.removeChannel(activeChannel).catch(() => {});
    }
  };
}

const MEDIA_BUCKET = 'display-media';

/**
 * Upload an image blob to the display-media bucket and return its public URL.
 * `pathPrefix` should identify the image slot (e.g. "MASJID-1/logo" or
 * "MASJID-1/slides/abc123"); a timestamp suffix is appended so replacing an
 * image always yields a fresh URL instead of hitting a stale cached one.
 */
export async function uploadImageToStorage(
  blob: Blob,
  pathPrefix: string,
  contentType: string
): Promise<string | null> {
  const supabase = await ensureSupabaseClient();
  if (!supabase) return null;

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${pathPrefix}-${Date.now()}.${ext}`;

  try {
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, blob, { contentType, upsert: true });

    if (error) {
      console.error('❌ [Supabase Storage] Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('❌ [Supabase Storage] Upload exception:', err);
    return null;
  }
}

/**
 * Best-effort delete of a previously uploaded image so replacing/removing a
 * picture doesn't leave orphaned files in the bucket. Safe no-op for URLs
 * that aren't from this bucket (external links, data: URIs, etc.)
 */
export async function deleteImageFromStorage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);

  const supabase = await ensureSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  } catch (err) {
    console.warn('⚠️ [Supabase Storage] Delete notice:', err);
  }
}
