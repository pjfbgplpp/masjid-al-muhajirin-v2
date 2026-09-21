import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  Sparkles,
  RefreshCw,
  Maximize2,
  Trash2,
  HelpCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { LayoutConfig } from '../../types';
import { ImageUploader } from '../common/ImageUploader';

interface MosqueLogoConfigCardProps {
  layout: LayoutConfig;
  displayCode: string;
  onChange: (updated: LayoutConfig) => void;
  onSave?: () => void;
  compact?: boolean;
}

// Curated high-resolution SVG Islamic Emblems (safe Data URLs with URI encoding)
const PRESET_EMBLEMS = [
  {
    id: 'kubah-emas',
    name: 'Kubah Masjid Emas',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#1B1F1C" stroke="#D4AF37" stroke-width="3"/>
        <path d="M50 15 C45 28 30 35 30 52 C30 65 40 70 50 70 C60 70 70 65 70 52 C70 35 55 28 50 15 Z" fill="#D4AF37"/>
        <path d="M50 8 L50 15 M46 11 L54 11" stroke="#FBBF24" stroke-width="2" stroke-linecap="round"/>
        <rect x="26" y="70" width="48" height="6" rx="2" fill="#D4AF37"/>
        <rect x="22" y="76" width="56" height="5" rx="1.5" fill="#B45309"/>
        <circle cx="50" cy="45" r="4" fill="#1B1F1C"/>
        <path d="M42 70 C42 62 58 62 58 70 Z" fill="#1B1F1C"/>
      </svg>
    `)}`,
  },
  {
    id: 'bulan-bintang',
    name: 'Bulan Bintang Sabit',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#064E3B" stroke="#34D399" stroke-width="3"/>
        <path d="M56 22 C40 22 28 35 28 50 C28 65 40 78 56 78 C64 78 71 74 76 68 C62 72 46 64 44 48 C42 34 54 24 68 24 C64 23 60 22 56 22 Z" fill="#FBBF24"/>
        <polygon points="68,36 71,43 78,43 73,48 75,55 68,50 62,55 64,48 59,43 66,43" fill="#FBBF24"/>
      </svg>
    `)}`,
  },
  {
    id: 'rub-el-hizb',
    name: 'Rub El Hizb (Bintang 8)',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <rect x="24" y="24" width="52" height="52" rx="4" fill="#0F766E" stroke="#2DD4BF" stroke-width="3"/>
        <rect x="24" y="24" width="52" height="52" rx="4" transform="rotate(45 50 50)" fill="#0F766E" stroke="#2DD4BF" stroke-width="3"/>
        <circle cx="50" cy="50" r="18" fill="#FBBF24" stroke="#D97706" stroke-width="2"/>
        <circle cx="50" cy="50" r="6" fill="#0F766E"/>
      </svg>
    `)}`,
  },
  {
    id: 'menara-kubah',
    name: 'Menara & Siluet Masjid',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
        <!-- Minaret Left -->
        <rect x="22" y="32" width="8" height="42" fill="#E2E8F0"/>
        <polygon points="26,18 21,32 31,32" fill="#38BDF8"/>
        <!-- Minaret Right -->
        <rect x="70" y="32" width="8" height="42" fill="#E2E8F0"/>
        <polygon points="74,18 69,32 79,32" fill="#38BDF8"/>
        <!-- Center Dome -->
        <path d="M50 28 C42 38 34 44 34 58 L66 58 C66 44 58 38 50 28 Z" fill="#F59E0B"/>
        <rect x="30" y="58" width="40" height="16" fill="#E2E8F0"/>
        <path d="M44 74 C44 67 56 67 56 74 Z" fill="#1E293B"/>
      </svg>
    `)}`,
  },
  {
    id: 'rehal-quran',
    name: 'Al-Qur\'an & Cahaya',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#2E1065" stroke="#A855F7" stroke-width="3"/>
        <!-- Book Pages -->
        <path d="M50 36 C42 32 30 35 24 38 L24 64 C30 61 42 58 50 62 C58 58 70 61 76 64 L76 38 C70 35 58 32 50 36 Z" fill="#F8FAFC" stroke="#A855F7" stroke-width="2"/>
        <line x1="50" y1="36" x2="50" y2="62" stroke="#A855F7" stroke-width="2"/>
        <!-- Stand / Rehal -->
        <polygon points="32,66 68,82 64,84 28,68" fill="#FBBF24"/>
        <polygon points="68,66 32,82 36,84 72,68" fill="#D97706"/>
        <!-- Rays -->
        <circle cx="50" cy="24" r="3" fill="#FBBF24"/>
      </svg>
    `)}`,
  },
  {
    id: 'kaligrafi-lingkar',
    name: 'Geometri Emas Monokrom',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#000000" stroke="#FBBF24" stroke-width="3"/>
        <circle cx="50" cy="50" r="40" stroke="#FBBF24" stroke-width="1.5" stroke-dasharray="4 3"/>
        <polygon points="50,18 58,36 78,36 62,48 68,68 50,56 32,68 38,48 22,36 42,36" fill="#FBBF24"/>
        <circle cx="50" cy="50" r="10" fill="#000000" stroke="#FBBF24" stroke-width="2"/>
        <circle cx="50" cy="50" r="4" fill="#FBBF24"/>
      </svg>
    `)}`,
  },
];

export const MosqueLogoConfigCard: React.FC<MosqueLogoConfigCardProps> = ({
  layout,
  displayCode,
  onChange,
  onSave,
}) => {
  const [previewBgMode, setPreviewBgMode] = useState<'dark' | 'light'>('dark');

  const currentLogo = layout.logoUrl || '';
  const isLogoEnabled = layout.showLogo ?? true;
  const currentFit = layout.logoFit || 'contain';
  const currentSize = layout.logoSize || 'base';
  const currentBg = layout.logoBg || 'transparent';

  const handleUpdate = (updates: Partial<LayoutConfig>) => {
    onChange({
      ...layout,
      ...updates,
    });
  };

  const handleSelectPreset = (dataUrl: string) => {
    handleUpdate({
      logoUrl: dataUrl,
      showLogo: true,
      logoFit: 'contain',
    });
  };

  const handleClearLogo = () => {
    handleUpdate({
      logoUrl: '',
    });
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 p-5 space-y-5 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-black text-white tracking-wide">
                Logo & Lambang Masjid (Header TV)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Pojok Kiri Layar
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Ganti lambang/logo masjid. Ukuran dan rasio gambar otomatis menyesuaikan kotak agar tidak terpotong.
            </p>
          </div>
        </div>

        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => handleUpdate({ showLogo: !isLogoEnabled })}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
            isLogoEnabled
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {isLogoEnabled ? (
            <>
              <Eye className="w-4 h-4" /> Lambang Aktif
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" /> Lambang Disembunyikan
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Live Preview & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Header Simulation (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pratinjau di TV
            </span>
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-white/5 text-[10px]">
              <button
                type="button"
                onClick={() => setPreviewBgMode('dark')}
                className={`px-2 py-0.5 rounded ${
                  previewBgMode === 'dark' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                }`}
              >
                Latar Gelap
              </button>
              <button
                type="button"
                onClick={() => setPreviewBgMode('light')}
                className={`px-2 py-0.5 rounded ${
                  previewBgMode === 'light' ? 'bg-amber-100 text-slate-900 font-bold' : 'text-slate-400'
                }`}
              >
                Latar Terang
              </button>
            </div>
          </div>

          {/* Simulated TV Header Container */}
          <div
            className={`p-4 rounded-xl border transition-all flex items-center gap-3.5 ${
              previewBgMode === 'dark'
                ? 'bg-[#1B1F1C] border-white/15 text-white'
                : 'bg-[#FDFBF7] border-amber-900/20 text-slate-900'
            }`}
          >
            {/* The Logo Box (Exact Replica of TvDisplayScreen) */}
            {isLogoEnabled ? (
              <div
                style={{
                  backgroundColor:
                    currentBg === 'transparent'
                      ? 'transparent'
                      : currentBg === '#ffffff'
                      ? '#ffffff'
                      : currentBg === 'accent'
                      ? '#D4AF37'
                      : previewBgMode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#FFFFFF',
                  borderColor: '#D4AF37',
                }}
                className={`rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md border-2 p-1 transition-all ${
                  currentSize === 'sm'
                    ? 'w-11 h-11'
                    : currentSize === 'lg'
                    ? 'w-16 h-16'
                    : currentSize === 'xl'
                    ? 'w-20 h-20'
                    : 'w-14 h-14'
                }`}
              >
                {currentLogo ? (
                  <img
                    src={currentLogo}
                    alt="Logo Masjid"
                    className={`w-full h-full transition-transform duration-200 ${
                      currentFit === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                    style={{
                      objectFit: currentFit === 'cover' ? 'cover' : 'contain',
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-bold select-none">🕌</span>
                )}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl border border-dashed border-red-500/40 bg-red-500/10 flex items-center justify-center text-[10px] text-red-400 text-center font-bold px-1">
                Logo Nonaktif
              </div>
            )}

            {/* Simulated Mosque Name in Header */}
            <div className="min-w-0 flex-1">
              <div
                className={`text-xs md:text-sm font-black truncate leading-tight ${
                  previewBgMode === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                Nama Masjid Anda
              </div>
              <div className="text-[10px] text-amber-400 font-bold truncate mt-0.5">
                Pusat Ibadah & Dakwah
              </div>
            </div>
          </div>

          {/* Status badge & dimensions */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mode Rasio:</span>
              <strong className="text-emerald-400">
                {currentFit === 'contain' ? '✓ Pas di Kotak (Proporsional)' : 'Penuh Kotak (Cover)'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status Gambar:</span>
              <span className="text-slate-200">
                {currentLogo ? 'Gambar Terpasang' : 'Ikon Default (🕌)'}
              </span>
            </div>
          </div>

          {currentLogo && (
            <button
              type="button"
              onClick={handleClearLogo}
              className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Logo (Gunakan Ikon 🕌)
            </button>
          )}
        </div>

        {/* Right Column: Upload, Presets & Sizing Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Image Uploader */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Upload Lambang / Gambar Logo Masjid
            </label>
            <p className="text-[11px] text-slate-300">
              Pilih file gambar logo masjid dari komputer/HP (JPG, PNG transparan, atau WebP), atau masukkan link gambar langsung.
            </p>

            <ImageUploader
              currentImageUrl={currentLogo}
              onImageSelected={(url) =>
                handleUpdate({
                  logoUrl: url,
                  showLogo: true,
                })
              }
              uploadPathPrefix={`${displayCode}/logo`}
              label="Pilih File Lambang / Logo Masjid"
              recommendedSize="Format Bebas (Lingkaran, Perisai, atau Persegi). Otomatis pas tanpa terpotong."
              clearButtonLabel="Kembalikan ke Ikon Default"
            />
          </div>

          {/* 2. Fit & Box Sizing Controls (Addressing: "ukuran/rasio gambar nanti bisa menyesuaikan") */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-white/10">
            {/* Control A: Image Fit (Ratio) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                1. Mode Penyesuaian Rasio
              </label>
              <select
                value={currentFit}
                onChange={(e) => handleUpdate({ logoFit: e.target.value as 'contain' | 'cover' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="contain">✓ Pas di Kotak (Tidak Terpotong)</option>
                <option value="cover">Penuh Kotak (Cover Area)</option>
              </select>
              <span className="text-[10px] text-emerald-400 block font-medium">
                *Rekomendasi "Pas di Kotak" agar seluruh lambang bulat/perisai terlihat utuh.
              </span>
            </div>

            {/* Control B: Logo Box Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                2. Ukuran Kotak Logo di TV
              </label>
              <select
                value={currentSize}
                onChange={(e) => handleUpdate({ logoSize: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="sm">Kecil (48px)</option>
                <option value="base">Sedang / Standar (56px)</option>
                <option value="lg">Besar (64px - Rekomendasi)</option>
                <option value="xl">Ekstra Besar (80px - TV 65"+)</option>
              </select>
              <span className="text-[10px] text-slate-400 block">
                Besar kecilnya kotak logo pada header atas TV.
              </span>
            </div>

            {/* Control C: Logo Box Background */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                3. Latar Belakang Kotak
              </label>
              <select
                value={currentBg}
                onChange={(e) => handleUpdate({ logoBg: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="transparent">Transparan / Senada Header</option>
                <option value="#ffffff">Putih Bersih (Untuk Logo Gelap/Putih)</option>
                <option value="accent">Aksen Emas / Hijau</option>
              </select>
              <span className="text-[10px] text-slate-400 block">
                Bagus bila logo Anda berlatar belakang putih atau gelap.
              </span>
            </div>
          </div>

          {/* 3. Preset Islamic Emblems (One-click choice) */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Pilihan Lambang Siap Pakai (Preset Islami)
              </label>
              <span className="text-[10px] text-slate-400">Klik untuk langsung memakai</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {PRESET_EMBLEMS.map((preset) => {
                const isSelected = currentLogo === preset.dataUrl;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.dataUrl)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950 border-emerald-400 shadow-md ring-2 ring-emerald-500/40'
                        : 'bg-slate-950 border-white/10 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden p-1 flex items-center justify-center bg-black/40 border border-white/10">
                      <img
                        src={preset.dataUrl}
                        alt={preset.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200 line-clamp-1">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Save button if provided */}
          {onSave && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onSave}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" /> Simpan Pengaturan Lambang TV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
