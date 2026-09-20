/**
 * Arabic Text & Hadith/Quran Separation & Formatter Utilities
 */

export interface ParsedArabicContent {
  arabic: string;
  translation: string;
  hasArabic: boolean;
}

/**
 * Cleanly extracts separate Arabic text and Indonesian translation.
 * If slide.arabicText is set, it uses it directly.
 * If not, it safely inspects description for mixed Arabic & Latin text.
 */
export function extractArabicAndTranslation(content: {
  arabicText?: string;
  description?: string;
  content?: string;
}): ParsedArabicContent {
  const arabicInput = (content.arabicText || '').trim();
  const descInput = (content.description || content.content || '').trim();

  if (arabicInput) {
    return {
      arabic: arabicInput,
      translation: descInput,
      hasArabic: true,
    };
  }

  // Check if description has Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/;
  if (arabicRegex.test(descInput)) {
    // Split by newlines or quote transitions
    const lines = descInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const arabicLines: string[] = [];
    const latinLines: string[] = [];

    for (const line of lines) {
      if (arabicRegex.test(line)) {
        arabicLines.push(line);
      } else {
        latinLines.push(line);
      }
    }

    if (arabicLines.length > 0) {
      return {
        arabic: arabicLines.join('\n'),
        translation: latinLines.join('\n'),
        hasArabic: true,
      };
    }
  }

  return {
    arabic: '',
    translation: descInput,
    hasArabic: false,
  };
}

export interface IslamicQuotePreset {
  id: string;
  category: 'hadith' | 'quran';
  badgeText: string;
  title: string;
  arabicText: string;
  translation: string;
}

export const ISLAMIC_QUOTE_PRESETS: IslamicQuotePreset[] = [
  {
    id: 'shalat-berjamaah',
    category: 'hadith',
    badgeText: 'MUTIARA HADITS',
    title: 'Keutamaan Shalat Berjamaah 27 Derajat',
    arabicText: 'صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً',
    translation: 'Shalat berjamaah lebih utama daripada shalat sendirian dengan dua puluh tujuh derajat. (HR. Bukhari & Muslim)',
  },
  {
    id: 'adab-masjid',
    category: 'hadith',
    badgeText: 'MUTIARA HADITS',
    title: 'Adab Masuk Masjid (Tahiyyatul Masjid)',
    arabicText: 'إِذَا دَخَلَ أَحَدُكُمُ الْمَسْجِدَ فَلَا يَجْلِسْ حَتَّى يُصَلِّيَ رَكْعَتَيْنِ',
    translation: 'Jika salah seorang di antara kalian masuk masjid, janganlah duduk sebelum shalat dua rakaat. (HR. Bukhari & Muslim)',
  },
  {
    id: 'mengingat-allah',
    category: 'quran',
    badgeText: 'AYAT AL-QUR\'AN',
    title: 'Perintah Dzikrullah & Bersyukur',
    arabicText: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    translation: 'Maka ingatlah kepada-Ku, niscaya Aku ingat (pula) kepadamu, dan bersyukurlah kepada-Ku, dan janganlah kamu mengingkari nikmat-Ku. (QS. Al-Baqarah: 152)',
  },
  {
    id: 'niat-ikhlas',
    category: 'hadith',
    badgeText: 'MUTIARA HADITS',
    title: 'Amalan Tergantung pada Niat',
    arabicText: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
    translation: 'Sesungguhnya setiap amalan tergantung pada niatnya, dan setiap orang akan mendapatkan balasan sesuai apa yang diniatkannya. (HR. Bukhari & Muslim)',
  },
  {
    id: 'menuntut-ilmu',
    category: 'hadith',
    badgeText: 'MUTIARA HADITS',
    title: 'Kewajiban Menuntut Ilmu Syar\'i',
    arabicText: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
    translation: 'Menuntut ilmu adalah kewajiban bagi setiap muslim. (HR. Ibnu Majah)',
  },
  {
    id: 'pahala-sedekah',
    category: 'quran',
    badgeText: 'AYAT AL-QUR\'AN',
    title: 'Keberkahan & Kelipatan Sedekah di Jalan Allah',
    arabicText: 'مَثَلُ الَّذِينَ يُنْفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنْبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنْبُلَةٍ مِائَةُ حَبَّةٍ',
    translation: 'Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji. (QS. Al-Baqarah: 261)',
  },
  {
    id: 'tebarkan-salam',
    category: 'hadith',
    badgeText: 'MUTIARA HADITS',
    title: 'Empat Kunci Masuk Surga dengan Damai',
    arabicText: 'أَفْشُوا السَّلَامَ، وَأَطْعِمُوا الطَّعَامَ، وَصِلُوا الْأَرْحَامَ، وَصَلُّوا بِاللَّيْلِ وَالنَّاسُ نِيَامٌ تَدْخُلُوا الْجَنَّةَ بِسَلَامٍ',
    translation: 'Tebarkanlah salam, berilah makan, sambunglah tali silaturahim, dan shalatlah di malam hari ketika manusia tertidur, niscaya kalian masuk surga dengan selamat. (HR. Tirmidzi)',
  },
  {
    id: 'doa-masuk-masjid',
    category: 'hadith',
    badgeText: 'DOA HARIAN',
    title: 'Doa Masuk ke Dalam Masjid',
    arabicText: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    translation: 'Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu. (HR. Muslim)',
  },
  {
    id: 'doa-keluar-masjid',
    category: 'hadith',
    badgeText: 'DOA HARIAN',
    title: 'Doa Keluar dari Masjid',
    arabicText: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    translation: 'Ya Allah, sesungguhnya aku memohon sebagian dari karunia-Mu. (HR. Muslim)',
  },
];
