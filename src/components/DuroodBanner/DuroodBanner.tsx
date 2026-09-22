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
      <button className="durood-restore" onClick={show} aria-label="Show Durood-e-Ibrahimi announcement ribbon">
        <span className="durood-restore-badge">﷽</span>
        <span className="durood-restore-text">✦ درودِ پاک — بارگاہِ نبوی ﷺ میں نذرانۂ عقیدت ✦ (Click to show banner)</span>
      </button>
    );
  }

  const duroodSegment = (
    <div className="durood-ticker-item">
      <span className="durood-arabic">
        اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ
      </span>
      <span className="durood-separator">✦</span>
      <span className="durood-arabic">
        اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ
      </span>
      <span className="durood-separator">✦</span>
      <span className="durood-tagline">
        درودِ پاک پڑھنے سے کاروبار، مال اور رزق میں بے پناہ خیر و برکت نصیب ہوتی ہے ﷺ
      </span>
      <span className="durood-separator">✦</span>
    </div>
  );

  return (
    <div className="durood-announcement-banner" role="region" aria-label="Durood Sharif Announcement Ribbon">
      {/* Left Announcement Badge */}
      <div className="durood-badge">
        <span className="durood-pulse-dot" />
        <span className="durood-badge-icon">﷽</span>
        <span className="durood-badge-label">دُرودِ پاک</span>
      </div>

      {/* Marquee ticker track container */}
      <div className="durood-marquee-container">
        <div className="durood-marquee-track">
          {duroodSegment}
          {duroodSegment}
          {duroodSegment}
        </div>
      </div>

      {/* Close button */}
      <button className="durood-dismiss-btn" onClick={hide} aria-label="Dismiss banner" title="Hide banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
};

export default DuroodBanner;
