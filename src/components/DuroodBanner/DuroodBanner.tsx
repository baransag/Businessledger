// src/components/DuroodBanner/DuroodBanner.tsx
import React, { useState, useEffect } from 'react';
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
        <span>﷽</span>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>درودِ ابراہیمی ﷺ — Click to expand</span>
      </button>
    );
  }

  return (
    <div className="durood-banner" role="banner" aria-label="Durood-e-Ibrahimi">
      {/* Geometric Islamic pattern */}
      <div className="durood-pattern" aria-hidden="true" />
      {/* Shimmer animation */}
      <div className="durood-shimmer" aria-hidden="true" />

      {/* Ornamental elements */}
      <span className="durood-ornament left" aria-hidden="true">❖</span>
      <span className="durood-ornament right" aria-hidden="true">❖</span>

      {/* Main content */}
      <div className="durood-content">
        <div className="durood-arabic" dir="rtl" lang="ar">
          اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ
        </div>
        <div className="durood-label">درودِ ابراہیمی ﷺ — Durood-e-Ibrahimi</div>
      </div>

      {/* Close button */}
      <button className="durood-close" onClick={hide} aria-label="Collapse Durood banner" title="Collapse">
        ✕
      </button>
    </div>
  );
};

export default DuroodBanner;
