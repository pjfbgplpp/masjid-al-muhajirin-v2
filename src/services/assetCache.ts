import { useEffect, useState } from 'react';

/**
 * Generate a graceful Islamic geometric placeholder data URI if an asset fails to load offline.
 */
export function getOfflinePlaceholderSvg(title: string = 'Masjid Media'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#022c22"/>
        <stop offset="50%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <pattern id="pat" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1" fill="#fbbf24" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <rect width="800" height="450" fill="url(#pat)"/>
    <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#fbbf24" font-weight="bold">🕌</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#f8fafc" opacity="0.85">${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * React hook that renders an image URL directly (the browser's own HTTP cache
 * handles repeat loads — no app-managed storage). Probes the URL with a plain
 * Image() load first so a broken/unreachable image falls back to a placeholder
 * instead of a broken-image icon.
 */
export function useCachedImage(rawUrl?: string, fallbackTitle?: string): string {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!rawUrl) return;

    const img = new Image();
    img.onerror = () => setFailed(true);
    img.src = rawUrl;

    return () => {
      img.onerror = null;
    };
  }, [rawUrl]);

  if (!rawUrl) return fallbackTitle ? getOfflinePlaceholderSvg(fallbackTitle) : '';
  if (failed) return fallbackTitle ? getOfflinePlaceholderSvg(fallbackTitle) : rawUrl;
  return rawUrl;
}
