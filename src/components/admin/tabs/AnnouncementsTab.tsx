import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Check,
  Calendar,
  Clock,
  User,
  Sparkles,
  Edit2,
  BookOpen,
} from 'lucide-react';
import { AnnouncementItem } from '../../../types';
import { ISLAMIC_QUOTE_PRESETS } from '../../../utils/arabicTextHelper';

interface AnnouncementsTabProps {
  announcements: AnnouncementItem[];
  onChange: (updated: AnnouncementItem[]) => void;
  onSave: () => void;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcements,
  onChange,
  onSave,
}) => {
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAddNew = () => {
    const newItem: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: 'Kajian Akbar Bulanan',
      content: 'Membahas Fiqih Ibadah Praktis Sehari-hari. Terbuka untuk Ikhwan dan Akhwat.',
      date: 'Sabtu, 29 Agustus 2026',
      time: 'Ba\'da Maghrib - Selesai',
      speaker: 'Ustadz Ahmad Fauzi, Lc., MA',
      category: 'kajian',
      isActive: true,
    };
    setEditingItem(newItem);
    setShowModal(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const existingIndex = announcements.findIndex((a) => a.id === editingItem.id);
    let updatedList: AnnouncementItem[];

    if (existingIndex >= 0) {
      updatedList = [...announcements];
      updatedList[existingIndex] = editingItem;
    } else {
      updatedList = [...announcements, editingItem];
    }

    onChange(updatedList);
    setShowModal(false);
    setEditingItem(null);
    setTimeout(() => {
      onSave();
    }, 50);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus pengumuman ini?')) {
      onChange(announcements.filter((a) => a.id !== id));
      setTimeout(() => {
        onSave();
      }, 50);
    }
  };

  const handleToggleActive = (id: string) => {
    onChange(
      announcements.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
    setTimeout(() => {
      onSave();
    }, 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Pengumuman & Agenda Kajian
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar pengumuman khotib Jum'at, kajian taklim, kegiatan sosial, dan tarbiyah.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tambah Pengumuman
        </button>
      </div>

      {/* Grid of Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              item.isActive
                ? 'bg-slate-900/80 border-white/10'
                : 'bg-slate-950/60 border-slate-800 opacity-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.category.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(item.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    item.isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <h3 className="text-base font-bold text-white whitespace-pre-line">{item.title}</h3>
              {item.arabicText && (
                <div dir="rtl" className="my-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 font-amiri font-bold text-lg leading-relaxed shadow-inner whitespace-pre-line">
                  {item.arabicText}
                </div>
              )}
              <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words whitespace-pre-line">{item.content}</p>

              <div className="mt-4 pt-3 border-t border-white/5 space-y-1 text-xs text-slate-400">
                {item.speaker && (
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Narasumber/Khotib: <strong>{item.speaker}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>{item.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{item.time}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(item);
                  setShowModal(true);
                }}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {showModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" /> Edit Pengumuman
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              {/* Quick Preset Selector */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Pilihan Cepat Hadits / Ayat:
                  </span>
                  <span className="text-[10px] text-slate-400">Klik untuk isi otomatis</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {ISLAMIC_QUOTE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          title: preset.title,
                          arabicText: preset.arabicText,
                          content: preset.translation,
                        })
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-200 border border-white/10 hover:border-amber-500/40 text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0"
                    >
                      {preset.category === 'quran' ? '📖' : '📜'} {preset.title.replace('Mutiara Hadits: ', '').replace('Ayat Pilihan: ', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* DEDICATED ARABIC TEXT FIELD */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Teks / Matan Bahasa Arab (Hadits / Ayat / Doa)
                  </label>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold uppercase tracking-wider">
                    Tampil di Atas Artinya
                  </span>
                </div>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={editingItem.arabicText || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, arabicText: e.target.value })}
                  placeholder="صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً..."
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-base text-amber-200 font-amiri font-bold leading-relaxed focus:outline-none focus:border-amber-400 placeholder:text-slate-600 placeholder:font-sans placeholder:text-xs"
                />
                <div className="flex items-center justify-between text-[10px] text-amber-200/70">
                  <span>Kolom tersendiri untuk tulisan Arab berharakat / gundul.</span>
                  {editingItem.arabicText && (
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, arabicText: '' })}
                      className="text-amber-400 hover:text-white underline"
                    >
                      Hapus Teks Arab
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Kategori
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      category: e.target.value as AnnouncementItem['category'],
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="kajian">Kajian & Taklim</option>
                  <option value="jumat">Shalat Jum'at</option>
                  <option value="tarbiyah">Tarbiyah / Pendidikan</option>
                  <option value="sosial">Sosial / Santunan</option>
                  <option value="keuangan">Keuangan & Kas</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {editingItem.arabicText ? 'Arti / Terjemahan Bahasa Indonesia' : 'Isi Pengumuman'}
                  </label>
                  {editingItem.arabicText && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      ✓ Posisi di bawah teks Arab pada TV
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder={
                    editingItem.arabicText
                      ? 'Tuliskan terjemahan bahasa Indonesia dan sumber riwayat / surat...'
                      : 'Tuliskan rincian pengumuman atau kegiatan...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">↵</span> Tekan Enter untuk membuat baris baru ke bawah.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Penceramah / Khotib (Opsional)
                </label>
                <input
                  type="text"
                  value={editingItem.speaker}
                  onChange={(e) => setEditingItem({ ...editingItem, speaker: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Hari / Tanggal
                  </label>
                  <input
                    type="text"
                    value={editingItem.date}
                    onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                    placeholder="Contoh: Ahad, 16 Agustus 2026"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    value={editingItem.time}
                    onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                    placeholder="Contoh: 18:30 WIB"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Simpan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-3 border-t border-slate-800 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all"
        >
          <Check className="w-4 h-4" /> Simpan Pengumuman
        </button>
      </div>
    </div>
  );
};
