import React from 'react';
import { SlideItem } from '../../types';
import { extractArabicAndTranslation } from '../../utils/arabicTextHelper';

interface SlideArabicDisplayProps {
  slide: SlideItem;
  themeAccent: string;
  themePrimary: string;
  isLight: boolean;
  textMuted: string;
  textColor?: string;
  slideTitleClass?: string;
  slideDescClass?: string;
  hasImage?: boolean;
  align?: 'center' | 'left';
  maxDescLines?: number;
}

export const SlideArabicDisplay: React.FC<SlideArabicDisplayProps> = ({
  slide,
  themeAccent,
  themePrimary,
  isLight,
  textMuted,
  textColor = '#ffffff',
  slideTitleClass = 'text-xl md:text-2xl lg:text-3xl',
  slideDescClass = 'text-sm md:text-base',
  hasImage = false,
  align = hasImage ? 'left' : 'center',
  maxDescLines = hasImage ? 3 : 4,
}) => {
  const { arabic, translation, hasArabic } = extractArabicAndTranslation(slide);

  // Arabic Font Size Override or Smart Default
  const getArabicSizeClass = () => {
    if (slide.arabicFontSize && slide.arabicFontSize !== 'auto') {
      switch (slide.arabicFontSize) {
        case 'sm':
          return 'text-base md:text-lg';
        case 'base':
          return 'text-lg md:text-xl';
        case 'lg':
          return 'text-xl md:text-2xl';
        case 'xl':
          return 'text-2xl md:text-3xl';
        case '2xl':
          return 'text-3xl md:text-4xl';
        case '3xl':
          return 'text-4xl md:text-5xl';
      }
    }
    // Default smart sizing
    return hasImage
      ? 'text-lg md:text-xl lg:text-2xl'
      : 'text-xl md:text-2xl lg:text-3xl xl:text-4xl';
  };

  const arabicSizeClass = getArabicSizeClass();

  // Arabic color: high-visibility golden amber on dark backgrounds, rich dark emerald/slate on light backgrounds
  const arabicColor = isLight ? themePrimary : (themeAccent || '#FBBF24');

  const isHadithOrQuran = slide.category === 'hadith' || slide.category === 'quran';
  // If user entered multi-line text (new lines with Enter) or already quoted, keep clean.
  // Only wrap quotes if it's a single-line hadith/quran quote without quotes.
  const shouldWrapQuotes =
    isHadithOrQuran &&
    translation &&
    !translation.startsWith('"') &&
    !translation.startsWith('“') &&
    !translation.includes('\n');

  const displayTranslation = shouldWrapQuotes ? `"${translation}"` : translation;

  if (hasImage) {
    return (
      <div className={`flex-1 flex flex-col justify-center my-auto min-w-0 ${align === 'center' ? 'text-center' : 'text-left'}`}>
        {/* Category Badge */}
        {slide.badgeText && (
          <span
            style={{ color: themeAccent }}
            className="uppercase text-xs md:text-sm tracking-widest font-black mb-1 inline-block"
          >
            {slide.badgeText}
          </span>
        )}

        {/* Title */}
        <h3
          className={`${slideTitleClass} font-black leading-snug mb-1.5 whitespace-pre-line`}
          style={{ color: isLight ? themePrimary : textColor }}
        >
          {slide.title}
        </h3>

        {/* 1. ARABIC TEXT ON TOP */}
        {hasArabic && (
          <div className="mb-2">
            <div
              dir="rtl"
              style={{ color: arabicColor }}
              className={`font-amiri font-bold leading-relaxed tracking-wide drop-shadow-sm whitespace-pre-line ${arabicSizeClass} ${
                align === 'center' ? 'text-center' : 'text-right'
              }`}
            >
              {arabic}
            </div>
            {/* Subtle Divider between Arabic and Indonesian */}
            <div
              className={`h-0.5 w-16 my-1.5 rounded-full ${align === 'center' ? 'mx-auto' : 'ml-auto'}`}
              style={{ backgroundColor: `${themeAccent}50` }}
            />
          </div>
        )}

        {/* 2. INDONESIAN MEANING / TRANSLATION BENEATH (Full Text Without Ellipsis Truncation, Vertically Centered) */}
        {translation && (
          <p
            className={`${slideDescClass} ${isHadithOrQuran ? 'italic' : ''} leading-relaxed break-words whitespace-pre-line`}
            style={{ color: textMuted }}
          >
            {displayTranslation}
          </p>
        )}
      </div>
    );
  }

  // Text-Only Slide (Spacious, Centered / Hero presentation)
  return (
    <div className={`w-full h-full flex flex-col justify-center items-center p-4 my-auto ${align === 'center' ? 'text-center' : 'text-left'}`}>
      {/* Category Badge */}
      {slide.badgeText && (
        <span
          style={{ color: themeAccent }}
          className="text-xs md:text-sm font-black uppercase tracking-widest mb-1.5 inline-block"
        >
          {slide.badgeText}
        </span>
      )}

      {/* Slide Title */}
      <h2
        className={`${slideTitleClass} font-black mb-2.5 max-w-3xl leading-snug whitespace-pre-line`}
        style={{ color: isLight ? themePrimary : textColor }}
      >
        {slide.title}
      </h2>

      {/* 1. ARABIC TEXT ON TOP */}
      {hasArabic && (
        <div className="w-full max-w-3xl my-2 px-2">
          <div
            dir="rtl"
            style={{ color: arabicColor }}
            className={`font-amiri font-bold leading-relaxed tracking-wide drop-shadow-md text-center whitespace-pre-line ${arabicSizeClass}`}
          >
            {arabic}
          </div>
          {/* Subtle Islamic Calligraphic Separator */}
          <div className="flex items-center justify-center gap-2 my-2 opacity-70">
            <span className="h-[1px] w-12" style={{ backgroundColor: themeAccent }} />
            <span className="text-xs" style={{ color: themeAccent }}>✦</span>
            <span className="h-[1px] w-12" style={{ backgroundColor: themeAccent }} />
          </div>
        </div>
      )}

      {/* 2. INDONESIAN MEANING / TRANSLATION BENEATH (Full Text Without Ellipsis Truncation, Vertically Centered) */}
      {translation && (
        <p
          className={`${slideDescClass} ${isHadithOrQuran ? 'italic' : ''} leading-relaxed max-w-3xl px-2 break-words text-center whitespace-pre-line`}
          style={{ color: textMuted }}
        >
          {displayTranslation}
        </p>
      )}
    </div>
  );
};
