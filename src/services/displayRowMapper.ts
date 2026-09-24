import type { SupabaseClient } from '@supabase/supabase-js';
import { DisplayConfig, SlideItem, AnnouncementItem, RunningTextItem } from '../types.js';

// Row <-> DisplayConfig shape conversion, plus the child-table write helpers.
// Used by both the browser client (services/supabase.ts) and the Express
// server (server.ts) so the two never drift out of sync on how the
// "displays" row + its 3 child tables (slides, announcements, running_texts)
// map onto a DisplayConfig object. Nothing here touches browser-only globals
// (import.meta.env, window, localStorage) so it's safe to import from Node too.

/** select() fragment for fetching a display together with its child rows. */
export const DISPLAY_SELECT_WITH_CHILDREN = '*, slides(*), announcements(*), running_texts(*)';

export interface SlideRow {
  id: string;
  display_id: string;
  title: string;
  description: string;
  arabic_text: string | null;
  image_url: string;
  duration_seconds: number;
  is_active: boolean;
  order_index: number;
  category: string;
  badge_text: string | null;
  title_font_size: string | null;
  description_font_size: string | null;
  arabic_font_size: string | null;
}

export interface AnnouncementRow {
  id: string;
  display_id: string;
  title: string;
  content: string;
  arabic_text: string | null;
  date: string | null;
  time: string | null;
  speaker: string | null;
  category: string;
  is_active: boolean;
}

export interface RunningTextRow {
  id: string;
  display_id: string;
  text: string;
  is_active: boolean;
  order_index: number;
}

/** The shape that still lives in displays.data (jsonb) after the split. */
export type DisplayDataColumn = Omit<DisplayConfig, 'slides' | 'announcements' | 'runningTexts'>;

export function buildDisplayDataColumn(display: DisplayConfig): DisplayDataColumn {
  const { slides, announcements, runningTexts, ...rest } = display;
  return rest;
}

export function buildSlideRows(displayId: string, slides: SlideItem[]): SlideRow[] {
  return slides.map((s) => ({
    id: s.id,
    display_id: displayId,
    title: s.title || '',
    description: s.description || '',
    arabic_text: s.arabicText ?? null,
    image_url: s.imageUrl || '',
    duration_seconds: s.durationSeconds ?? 8,
    is_active: s.isActive ?? true,
    order_index: s.order ?? 0,
    category: s.category || 'custom',
    badge_text: s.badgeText ?? null,
    title_font_size: s.titleFontSize ?? null,
    description_font_size: s.descriptionFontSize ?? null,
    arabic_font_size: s.arabicFontSize ?? null,
  }));
}

export function buildAnnouncementRows(displayId: string, items: AnnouncementItem[]): AnnouncementRow[] {
  return items.map((a) => ({
    id: a.id,
    display_id: displayId,
    title: a.title || '',
    content: a.content || '',
    arabic_text: a.arabicText ?? null,
    date: a.date ?? null,
    time: a.time ?? null,
    speaker: a.speaker ?? null,
    category: a.category || 'kajian',
    is_active: a.isActive ?? true,
  }));
}

export function buildRunningTextRows(displayId: string, items: RunningTextItem[]): RunningTextRow[] {
  return items.map((r) => ({
    id: r.id,
    display_id: displayId,
    text: r.text || '',
    is_active: r.isActive ?? true,
    order_index: r.order ?? 0,
  }));
}

export function parseSlideRow(row: SlideRow): SlideItem {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    arabicText: row.arabic_text ?? undefined,
    imageUrl: row.image_url || '',
    durationSeconds: row.duration_seconds ?? 8,
    isActive: row.is_active ?? true,
    order: row.order_index ?? 0,
    category: (row.category as SlideItem['category']) || 'custom',
    badgeText: row.badge_text ?? undefined,
    titleFontSize: (row.title_font_size as SlideItem['titleFontSize']) ?? undefined,
    descriptionFontSize: (row.description_font_size as SlideItem['descriptionFontSize']) ?? undefined,
    arabicFontSize: (row.arabic_font_size as SlideItem['arabicFontSize']) ?? undefined,
  };
}

export function parseAnnouncementRow(row: AnnouncementRow): AnnouncementItem {
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    arabicText: row.arabic_text ?? undefined,
    date: row.date || '',
    time: row.time || '',
    speaker: row.speaker || '',
    category: (row.category as AnnouncementItem['category']) || 'kajian',
    isActive: row.is_active ?? true,
  };
}

export function parseRunningTextRow(row: RunningTextRow): RunningTextItem {
  return {
    id: row.id,
    text: row.text || '',
    isActive: row.is_active ?? true,
    order: row.order_index ?? 0,
  };
}

/**
 * Reassemble a full DisplayConfig from a displays row (data jsonb + top-level
 * id/code/name) plus its joined child rows. Children are sorted by order_index
 * where applicable so the array order is deterministic regardless of DB order.
 */
export function assembleDisplayConfig(
  displayRow: { id: string; code: string; name: string; data: any; created_at?: string; updated_at?: string },
  slideRows: SlideRow[],
  announcementRows: AnnouncementRow[],
  runningTextRows: RunningTextRow[]
): DisplayConfig {
  const base = displayRow.data && typeof displayRow.data === 'object' ? displayRow.data : {};
  return {
    ...base,
    id: displayRow.id || base.id,
    code: (displayRow.code || base.code || 'MASJID-01').trim().toUpperCase(),
    name: displayRow.name || base.name || 'Masjid Utama',
    createdAt: base.createdAt || displayRow.created_at,
    updatedAt: displayRow.updated_at || base.updatedAt || new Date().toISOString(),
    slides: slideRows
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(parseSlideRow),
    announcements: announcementRows.map(parseAnnouncementRow),
    runningTexts: runningTextRows
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(parseRunningTextRow),
  } as DisplayConfig;
}

/**
 * Upsert the rows of one child table (slides/announcements/running_texts) for
 * a display, deleting any existing rows that are no longer present in `rows`.
 */
export async function syncChildRows(
  supabase: SupabaseClient,
  table: 'slides' | 'announcements' | 'running_texts',
  displayId: string,
  rows: { id: string }[]
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from(table)
    .select('id')
    .eq('display_id', displayId);

  if (fetchErr) {
    console.warn(`⚠️ [Supabase] Could not read existing ${table} for diffing:`, fetchErr.message);
  }

  const existingIds = new Set((existing || []).map((r: any) => r.id));
  const newIds = new Set(rows.map((r) => r.id));
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', toDelete);
    if (error) console.warn(`⚠️ [Supabase] ${table} delete-removed notice:`, error.message);
  }

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) console.warn(`⚠️ [Supabase] ${table} upsert notice:`, error.message);
  }
}

/** Write all 3 child tables for a display in one call, replacing whatever previously existed. */
export async function saveDisplayChildren(
  supabase: SupabaseClient,
  display: DisplayConfig,
  displayId: string
): Promise<void> {
  await Promise.all([
    syncChildRows(supabase, 'slides', displayId, buildSlideRows(displayId, display.slides || [])),
    syncChildRows(supabase, 'announcements', displayId, buildAnnouncementRows(displayId, display.announcements || [])),
    syncChildRows(supabase, 'running_texts', displayId, buildRunningTextRows(displayId, display.runningTexts || [])),
  ]);
}
