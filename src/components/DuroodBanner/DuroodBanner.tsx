// src/components/DuroodBanner/DuroodBanner.tsx
import React, { useState } from 'react';
import './DuroodBanner.css';

const STORAGE_KEY = 'duroodBannerVisible';

const DuroodBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch { return true; }
  });

  const hide = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, 'false'); } catch {}
  };

  const show = () => {
    setVisible(true);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
  };

  if (!visible) {
    return (
      <button className="durood-restore" onClick={show} aria-label="Show Durood-e-Ibrahimi banner">
        <span className="durood-restore-badge">﷽</span>
        <span className="durood-restore-text">✦ درودِ پاک — بارگاہِ نبوی ﷺ میں نذرانۂ عقیدت ✦ (Click to show banner)</span>
      </button>
    );
  }

  const duroodFirstPart = "اَللّٰھُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَّعَلٰى اٰلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلٰى اِبْرَاھِيْمَ وَعَلٰى اٰلِ اِبْرَاھِيْمَ اِنَّكَ حَمِيْدٌ مَّجِيْدٌ";
  const duroodSecondPart = "اَللّٰھُمَّ بَارِكْ عَلٰى مُحَمَّدٍ وَّعَلٰى اٰلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلٰى اِبْرَاھِيْمَ وَعَلٰى اٰلِ اِبْرَاھِيْمَ اِنَّكَ حَمِيْدٌ مَّجِيْدٌ";

  return (
    <aside className="durood-announcement-banner" role="region" aria-label="Durood-e-Ibrahimi announcement ribbon">
      {/* Background Islamic Geometric Pattern Accent & Light Sweep */}
      <div className="durood-bg-pattern" aria-hidden="true" />
      <div className="durood-shimmer-sweep" aria-hidden="true" />

      <div className="durood-banner-inner">
        {/* Left Badge: Title */}
        <div className="durood-badge">
          <span className="durood-pulse-dot" />
          <span className="durood-badge-icon">﷽</span>
          <span className="durood-badge-label">درودِ ابراہیمی ﷺ</span>
        </div>

        {/* Center: Complete Arabic Durood Text */}
        <div className="durood-text-wrapper" dir="rtl">
          <div className="durood-arabic-content">
            <span className="durood-ornament-bracket">﴿</span>
            <span className="durood-arabic-part">{duroodFirstPart}</span>
            <span className="durood-separator" aria-hidden="true">۞</span>
            <span className="durood-arabic-part">{duroodSecondPart}</span>
            <span className="durood-ornament-bracket">﴾</span>
          </div>
        </div>

        {/* Right: Integrated Dismiss Button */}
        <button
          className="durood-dismiss-btn"
          onClick={hide}
          aria-label="Hide Durood Banner"
          title="Hide banner (preference saved)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default DuroodBanner;
