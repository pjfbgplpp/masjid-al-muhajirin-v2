import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  Download,
  Compass,
  ArrowRight,
  Palette,
  Layout,
  QrCode,
  HelpCircle,
  ChevronRight,
  Calendar,
  Sliders,
  Sun,
  Moon,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Flame,
  Radio,
  Bell,
  Activity,
} from 'lucide-react';
import { DisplayConfig, PrayerState, PrayerTimeItem } from '../../../types';
import { TvDisplayScreen } from '../../tv/TvDisplayScreen';
import { getHijriDate } from '../../../utils/hijriCalendar';
import { computePrayerState } from '../../../utils/prayerCalculator';

interface OverviewTabProps {
  config: DisplayConfig;
  prayerState: PrayerState;
  onNavigateTab: (tabId: string) => void;
  onOpenTvDisplay: () => void;
  onExportPackage: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  prayerState,
  onNavigateTab,
  onOpenTvDisplay,
  onExportPackage,
}) => {
  // Live ticking clock for the Dashboard
  const [liveTime, setLiveTime] = useState<Date>(new Date());
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
      setColonVisible((prev) => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute guaranteed prayer times fallback so jam sholat is NEVER empty or hidden
  const computedFallback = useMemo(() => {
    return computePrayerState(
      config.location,
      config.prayerAdjustments,
      config.prayerModeSettings,
      liveTime
    );
  }, [config.location, config.prayerAdjustments, config.prayerModeSettings, liveTime]);

  // Use props prayerState if populated, otherwise use live computedFallback
  const activePrayerState = useMemo(() => {
    if (prayerState?.times && prayerState.times.length > 0) {
      return prayerState;
    }
    return computedFallback;
  }, [prayerState, computedFallback]);

  const prayerTimes: PrayerTimeItem[] = activePrayerState?.times || computedFallback.times || [];

  const hijriDate = getHijriDate(liveTime, config.layout?.hijriAdjustmentDays || 0);
  const gregorianDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(liveTime);

  const hoursStr = String(liveTime.getHours()).padStart(2, '0');
  const minsStr = String(liveTime.getMinutes()).padStart(2, '0');
  const secsStr = String(liveTime.getSeconds()).padStart(2, '0');

  const getPrayerIcon = (id: string) => {
    switch (id) {
      case 'imsak':
      case 'maghrib':
      case 'isha':
        return <Moon className="w-4 h-4 text-amber-300" />;
      case 'fajr':
        return <Sun className="w-4 h-4 text-sky-300" />;
      case 'sunrise':
      case 'dhuha':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'dhuhr':
      case 'asr':
      default:
        return <Sun className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Live Digital Clock (Solusi: Jam Sholat & Jam Ticking Muncul Jelas di Dashboard) */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-2 border-emerald-500/50 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Mosque Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-bold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                Layar Aktif: {config.name} ({config.code})
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                <Radio className="w-3 h-3 text-amber-300 animate-pulse" />
                Live Real-time WIB
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow">
              {config.location.mosqueName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-100 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {config.location.city}, {config.location.province}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-200">
                GPS: {config.location.latitude.toFixed(4)}, {config.location.longitude.toFixed(4)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-200 font-semibold">
                Metode: {config.location.calculationMethod || 'KEMENAG RI'}
              </span>
            </div>
          </div>

          {/* Real-time Big Digital Clock Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 bg-slate-950/80 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-inner">
            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-1 font-mono font-black text-white leading-none">
                <span className="text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white drop-shadow">
                  {hoursStr}
                  <span className={`text-amber-400 transition-opacity duration-200 ${colonVisible ? 'opacity-100' : 'opacity-25'}`}>
                    :
                  </span>
                  {minsStr}
                </span>
                <span className="text-xl sm:text-2xl text-amber-400 font-bold ml-1">
                  :{secsStr}
                </span>
                <span className="text-xs text-emerald-300 font-bold ml-1.5 uppercase">
                  WIB
                </span>
              </div>

              <div className="mt-2 text-xs sm:text-sm font-semibold text-slate-100">
                {gregorianDateStr}
              </div>
              <div className="text-xs font-bold text-amber-300 font-amiri text-base mt-0.5">
                {hijriDate.formatted}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenTvDisplay}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Buka Layar TV
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('preview')}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Tv className="w-4 h-4 text-emerald-400" />
                Simulasi TV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Jadwal & Jam Sholat Hari Ini (8 Waktu Sholat dengan Kontras Tinggi & Huruf Terbaca Jelas) */}
      <div className="rounded-2xl bg-slate-900 border-2 border-emerald-500/50 p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  Jadwal & Jam Sholat Hari Ini
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 font-black border border-emerald-400/40">
                    Hisab Kemenag RI
                  </span>
                </h3>
                <p className="text-xs text-slate-200 font-medium">
                  {gregorianDateStr} • <span className="text-amber-300 font-bold">{hijriDate.formatted}</span> • Zona {config.location.timezone}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('prayer')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              Koreksi Menit Sholat & Iqamah
            </button>
          </div>
        </div>

        {/* 8 Prayer Time Cards Grid (Sangat Terang, Kontras Tinggi, Huruf dan Angka Jelas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {prayerTimes.map((prayer: PrayerTimeItem) => {
            const isNext = prayer.isNext;
            const isCurrent = prayer.isCurrent;
            const isPassed = prayer.isPassed;

            return (
              <div
                key={prayer.id}
                className={`rounded-2xl p-3.5 flex flex-col justify-between items-center text-center transition-all relative overflow-hidden shadow-md ${
                  isNext
                    ? 'bg-gradient-to-b from-amber-500/30 via-slate-900 to-slate-950 border-2 border-amber-400 shadow-xl shadow-amber-950/70 ring-2 ring-amber-400/60 scale-[1.03]'
                    : isCurrent
                    ? 'bg-gradient-to-b from-emerald-500/30 via-slate-900 to-slate-950 border-2 border-emerald-400 shadow-xl shadow-emerald-950/70 ring-2 ring-emerald-400/60'
                    : isPassed
                    ? 'bg-slate-900 border-2 border-slate-700/80 hover:border-slate-600'
                    : 'bg-slate-900 border-2 border-slate-700 hover:border-emerald-500/60'
                }`}
              >
                {/* Top Arabic & Icon */}
                <div className="w-full flex items-center justify-between gap-1 mb-1">
                  <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                    {getPrayerIcon(prayer.id)}
                  </div>
                  <span
                    className={`text-sm font-amiri font-bold leading-none ${
                      isNext ? 'text-amber-300' : isCurrent ? 'text-emerald-300' : 'text-amber-200'
                    }`}
                  >
                    {prayer.arabicName}
                  </span>
                </div>

                {/* Prayer Name (Bright, Crisp White/Gold) */}
                <div
                  className={`text-xs font-black uppercase tracking-wider my-1 ${
                    isNext ? 'text-amber-200 font-black' : isCurrent ? 'text-emerald-200 font-black' : 'text-white'
                  }`}
                >
                  {prayer.name}
                </div>

                {/* Exact Prayer Time in Big Bold Monospace */}
                <div
                  className={`font-mono font-black tracking-tight my-1 drop-shadow-sm ${
                    isNext
                      ? 'text-2xl sm:text-3xl text-amber-300'
                      : isCurrent
                      ? 'text-2xl sm:text-3xl text-emerald-300'
                      : isPassed
                      ? 'text-xl sm:text-2xl text-slate-100 font-bold'
                      : 'text-2xl sm:text-3xl text-white'
                  }`}
                >
                  {prayer.time}
                </div>

                {/* High Contrast Status Badge */}
                <div className="w-full pt-1.5">
                  {isNext ? (
                    <div className="space-y-1">
                      <span className="w-full inline-block bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        ⏱️ Berikutnya
                      </span>
                      <span className="block text-[11px] text-amber-300 font-mono font-bold truncate">
                        {activePrayerState.countdownFormatted} lagi
                      </span>
                    </div>
                  ) : isCurrent ? (
                    <span className="w-full inline-block bg-emerald-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                      ● Berlangsung
                    </span>
                  ) : isPassed ? (
                    <span className="w-full inline-block bg-slate-800 text-slate-200 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase border border-slate-700">
                      Selesai
                    </span>
                  ) : (
                    <span className="w-full inline-block bg-emerald-950/80 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase border border-emerald-600/40">
                      Akan Datang
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Status Bar under Prayer Times */}
        <div className="rounded-xl bg-slate-950 border-2 border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2.5 text-slate-100">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="font-semibold text-white text-xs sm:text-sm">
              Menuju Shalat <strong className="text-amber-300 font-black uppercase text-sm sm:text-base">{activePrayerState.nextPrayer?.name || 'Maghrib'}</strong> ({activePrayerState.nextPrayer?.time} WIB):
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-amber-300 bg-amber-500/25 px-2.5 py-0.5 rounded-lg border border-amber-400/50 shadow-sm">
              {activePrayerState.countdownFormatted}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-200 text-xs font-medium">
            <span>Durasi Adzan: <strong className="text-white font-mono">{config.prayerModeSettings?.adzanDurationMinutes || 3} mnt</strong></span>
            <span className="text-slate-400">•</span>
            <span>Countdown Iqamah: <strong className="text-white font-mono">{config.prayerModeSettings?.iqamahCountdownMinutes?.maghrib || 10} mnt</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Key Status Metrics (4 High-Contrast Cards, No Dim Text) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Sholat Berikutnya */}
        <div className="rounded-2xl bg-slate-900 border-2 border-amber-500/50 p-4.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-amber-300 uppercase tracking-wider text-xs">Sholat Berikutnya</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-200 uppercase tracking-tight">
            {activePrayerState.nextPrayer?.name || 'MAGHRIB'}
          </div>
          <div className="text-xs text-slate-100 font-mono font-bold">
            Pukul {activePrayerState.nextPrayer?.time} WIB <span className="text-amber-300 font-black">({activePrayerState.countdownFormatted})</span>
          </div>
        </div>

        {/* Lokasi & GPS */}
        <div className="rounded-2xl bg-slate-900 border-2 border-emerald-500/50 p-4.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-emerald-300 uppercase tracking-wider text-xs">Hisab & Lokasi</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white truncate">
            {config.location.city}
          </div>
          <div className="text-xs text-slate-100 font-medium truncate">
            Kemenag RI • Mazhab {config.location.madhab}
          </div>
        </div>

        {/* Konten Poster & Teks */}
        <div className="rounded-2xl bg-slate-900 border-2 border-sky-500/50 p-4.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-sky-300 uppercase tracking-wider text-xs">Konten Berputar</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {config.slides.filter((s) => s.isActive).length} <span className="text-xs font-medium text-slate-200">Poster Aktif</span>
          </div>
          <div className="text-xs text-sky-200 font-semibold">
            {config.runningTexts.filter((t) => t.isActive).length} Baris Running Text Aktif
          </div>
        </div>

        {/* Tema & Layout */}
        <div className="rounded-2xl bg-slate-900 border-2 border-purple-500/50 p-4.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-purple-300 uppercase tracking-wider text-xs">Tampilan Layar</span>
            <Palette className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white truncate capitalize">
            {config.theme.name || 'Zamrud Modern'}
          </div>
          <div className="text-xs text-purple-200 font-semibold capitalize">
            Layout: {config.layout.templateId}
          </div>
        </div>
      </div>

      {/* 4. Live TV Monitor Preview (16:9) */}
      <div className="rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tv className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Pratinjau Layar TV (Live 16:9)</h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-black uppercase tracking-wider">
              Sinkron Real-time
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('preview')}
            className="text-xs text-emerald-300 hover:text-emerald-100 flex items-center gap-1 font-bold transition-colors"
          >
            Buka Simulasi Penuh <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black">
          <TvDisplayScreen config={config} isPreview={true} />
        </div>
      </div>

      {/* 5. PUSAT KONFIGURASI & NAVIGASI CEPAT (DENGAN KONTRAS TINGGI & TEKS TERBACA JELAS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-base font-black text-white uppercase tracking-wider">
            Pusat Konfigurasi & Navigasi Cepat
          </h3>
          <span className="text-xs text-slate-200 font-medium">Pilih menu untuk langsung mengedit pengaturan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* GROUP 1: SISTEM & JADWAL INTI (DI ATAS / PALING KIRI) */}
          <div className="rounded-2xl bg-slate-900 border-2 border-emerald-500/40 p-4.5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-300 font-black text-xs pb-2 border-b border-slate-800 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              1. Sistem & Jadwal Inti
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('location')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">Lokasi & GPS Masjid</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Nama masjid, kota, koordinat GPS & metode hisab</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('prayer')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Jadwal Sholat & Iqamah</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Koreksi menit sholat & durasi countdown iqamah</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('displays')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-teal-300">Multi-Display TV</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Kelola dan tambah beberapa layar TV masjid</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-300 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* GROUP 2: KONTEN & INFORMASI MASJID (DI TENGAH) */}
          <div className="rounded-2xl bg-slate-900 border-2 border-sky-500/40 p-4.5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-sky-300 font-black text-xs pb-2 border-b border-slate-800 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              2. Konten & Informasi Masjid
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('slideshow')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300">Slide Poster & Info</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Upload poster kajian, kas masjid, pengumuman</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('running-text')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300">Running Text</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Pesan berjalan di bagian bawah layar TV</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('qrcode')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-pink-300">QR Code & Infaq</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">QRIS donasi dan nomor rekening kas masjid</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-300 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* GROUP 3: TAMPILAN, DESAIN & PANDUAN (DI BAWAH / KANAN) */}
          <div className="rounded-2xl bg-slate-900 border-2 border-amber-500/40 p-4.5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-300 font-black text-xs pb-2 border-b border-slate-800 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              3. Tema & Tampilan Layar
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('theme')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Tema & Warna Layar</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">5 Preset tema visual & penyesuaian warna</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('layout')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Layout className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-300">Tata Letak (Layout)</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Landscape, Split Screen, Jumbotron & Portrait</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('guide')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/60 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">Panduan & TV Offline</h4>
                    <p className="text-xs text-slate-200 font-medium group-hover:text-white">Petunjuk Smart TV, STB, & unduh paket ZIP</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
