// src/components/BankLogo/BankLogo.tsx
import React from 'react';

interface BankLogoProps {
  accountName: string;
  type?: 'bank' | 'wallet' | 'cash';
  size?: number;
  className?: string;
}

export const BankLogo: React.FC<BankLogoProps> = ({
  accountName,
  type = 'bank',
  size = 40,
  className = '',
}) => {
  const norm = accountName.trim().toLowerCase();

  // 0. Office Cash / Cash Accounts
  if (norm.includes('office cash') || norm === 'cash' || type === 'cash') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 10px rgba(15,118,110,0.35)' }}
      >
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F766E"/>
            <stop offset="100%" stopColor="#042F2E"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#cashGrad)" />
        {/* Subtle decorative security pattern border */}
        <rect x="7" y="7" width="86" height="86" rx="14" fill="none" stroke="#34D399" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6"/>
        {/* Currency Note symbol */}
        <rect x="18" y="24" width="64" height="42" rx="6" fill="#134E4A" stroke="#2DD4BF" strokeWidth="2"/>
        <circle cx="50" cy="45" r="14" fill="#0F766E" stroke="#FDE047" strokeWidth="1.8"/>
        {/* Pakistani Rupee Symbol / Rs */}
        <text x="50" y="51" textAnchor="middle" fill="#FEF08A" fontSize="16" fontWeight="900" fontFamily="sans-serif">Rs</text>
        <circle cx="28" cy="45" r="3" fill="#2DD4BF" opacity="0.8"/>
        <circle cx="72" cy="45" r="3" fill="#2DD4BF" opacity="0.8"/>
        {/* Bottom Cash Label */}
        <rect x="24" y="72" width="52" height="18" rx="4" fill="#FDE047"/>
        <text x="50" y="85" textAnchor="middle" fill="#042F2E" fontSize="10" fontWeight="900" letterSpacing="1">CASH</text>
      </svg>
    );
  }

  // 1. Meezan Bank & Safe Solutions
  if (norm.includes('meezan') || (norm.includes('safe solutions') && !norm.includes('alfalah'))) {
    const isAsif = norm.includes('asif');
    const isSafeSol = norm.includes('safe solutions') || norm === 'safe solutions';
    const isMain = norm.includes('main');

    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(27,107,58,0.25)' }}
      >
        <circle cx="50" cy="50" r="48" fill="#1B6B3A" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.7"/>
        <path d="M50 16 C38 16 30 24 30 36 C30 44 35 50 42 53 L42 63 L36 63 L36 67 L64 67 L64 63 L58 63 L58 53 C65 50 70 44 70 36 C70 24 62 16 50 16 Z" fill="#FFFFFF"/>
        <circle cx="50" cy="34" r="5.5" fill="#1B6B3A"/>
        <path d="M47 28 L53 28 L53 40 L47 40 Z" fill="#D4AF37"/>
        {/* Distinguish Safe Solutions, Main vs Muhammad Asif */}
        {isAsif ? (
          <>
            <rect x="14" y="73" width="72" height="18" rx="4" fill="#D4AF37"/>
            <text x="50" y="86" textAnchor="middle" fill="#1B6B3A" fontSize="9" fontWeight="900" letterSpacing="0.5">M. ASIF</text>
          </>
        ) : isSafeSol ? (
          <>
            <rect x="6" y="73" width="88" height="18" rx="4" fill="#FFFFFF"/>
            <text x="50" y="86" textAnchor="middle" fill="#1B6B3A" fontSize="7.5" fontWeight="900" letterSpacing="0.3">SAFE SOLUTIONS</text>
          </>
        ) : isMain ? (
          <>
            <rect x="18" y="73" width="64" height="18" rx="4" fill="#FFFFFF"/>
            <text x="50" y="86" textAnchor="middle" fill="#1B6B3A" fontSize="9" fontWeight="900" letterSpacing="0.8">MAIN</text>
          </>
        ) : (
          <text x="50" y="84" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" letterSpacing="1">MEEZAN</text>
        )}
      </svg>
    );
  }

  // 2. HBL (Habib Bank Limited)
  if (norm.includes('hbl') || norm.includes('habib bank limited')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,130,105,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#008269" />
        <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="#005A48"/>
        <polygon points="50,18 78,34 50,50 22,34" fill="#00B894"/>
        <polygon points="22,34 50,50 50,82 22,66" fill="#008269"/>
        <polygon points="78,34 50,50 50,82 78,66" fill="#006E58"/>
        <text x="50" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="21" fontWeight="900" letterSpacing="1.5" fontFamily="Arial, sans-serif">HBL</text>
      </svg>
    );
  }

  // 3. MCB (Muslim Commercial Bank)
  if (norm === 'mcb' || (norm.includes('mcb') && !norm.includes('mcib') && !norm.includes('islamic'))) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(247,148,29,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#F7941D" />
        <circle cx="50" cy="50" r="38" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="34" fill="#F7941D" />
        <text x="50" y="56" textAnchor="middle" fill="#FFFFFF" fontSize="20" fontWeight="900" letterSpacing="1" fontFamily="Arial, sans-serif">MCB</text>
        <text x="50" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="800" letterSpacing="1.5">BANK</text>
      </svg>
    );
  }

  // 4. MCIB (MCB Islamic Bank)
  if (norm.includes('mcib') || (norm.includes('mcb') && norm.includes('islamic'))) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(27,54,93,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#1B365D" />
        <rect x="30" y="30" width="40" height="40" rx="4" fill="#008269" transform="rotate(45 50 50)"/>
        <rect x="30" y="30" width="40" height="40" rx="4" fill="#00A887" />
        <circle cx="50" cy="50" r="18" fill="#1B365D" />
        <text x="50" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" letterSpacing="0.5" fontFamily="Arial, sans-serif">MCIB</text>
        <text x="50" y="86" textAnchor="middle" fill="#00D2A0" fontSize="8" fontWeight="800" letterSpacing="1">ISLAMIC</text>
      </svg>
    );
  }

  // 5. NBP (National Bank of Pakistan)
  if (norm.includes('nbp') || norm.includes('national bank')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,92,41,0.25)' }}
      >
        <circle cx="50" cy="50" r="48" fill="#005C29" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#D4AF37" strokeWidth="2"/>
        <path d="M51 22 C43 22 37 29 37 38 C37 47 44 54 53 54 C56 54 59 53 61 51 C55 52 47 48 47 38 C47 29 53 24 61 25 C58 23 55 22 51 22 Z" fill="#D4AF37"/>
        <polygon points="57,32 59,36 64,36 60,39 61,43 57,40 53,43 54,39 50,36 55,36" fill="#D4AF37"/>
        <rect x="22" y="58" width="56" height="20" rx="5" fill="#D4AF37" />
        <text x="50" y="73" textAnchor="middle" fill="#005C29" fontSize="15" fontWeight="900" letterSpacing="1" fontFamily="Arial, sans-serif">NBP</text>
      </svg>
    );
  }

  // 6. Bank Alfalah (Safe Solutions & Muhammad Asif)
  if (norm.includes('alfalah')) {
    const isAsif = norm.includes('asif');
    const isSafeSol = norm.includes('safe');

    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(237,28,36,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#FFFFFF" stroke="#ED1C24" strokeWidth="1.5" />
        <path d="M50 16 C30 16 18 30 18 50 C18 68 32 82 50 82 C65 82 78 72 80 58 C82 45 74 34 62 34 C52 34 44 42 44 52 C44 60 50 66 58 66 C64 66 68 62 68 56" fill="none" stroke="#ED1C24" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="58" cy="56" r="4.5" fill="#002D62"/>
        {isAsif ? (
          <>
            <rect x="12" y="76" width="76" height="18" rx="4" fill="#ED1C24"/>
            <text x="50" y="89" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" letterSpacing="0.5">M. ASIF</text>
          </>
        ) : isSafeSol ? (
          <>
            <rect x="8" y="76" width="84" height="18" rx="4" fill="#ED1C24"/>
            <text x="50" y="89" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="900" letterSpacing="0.3">SAFE SOL</text>
          </>
        ) : (
          <text x="50" y="93" textAnchor="middle" fill="#ED1C24" fontSize="8" fontWeight="800" letterSpacing="0.5">ALFALAH</text>
        )}
      </svg>
    );
  }

  // 7. Faisal Bank / Faysal Bank
  if (norm.includes('faisal') || norm.includes('faysal')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,103,71,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#006747" />
        <polygon points="50,16 78,44 50,72 22,44" fill="#A6192E" />
        <polygon points="50,22 72,44 50,66 28,44" fill="#FFFFFF" />
        <polygon points="50,28 66,44 50,60 34,44" fill="#006747" />
        <text x="50" y="50" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif">fb</text>
        <text x="50" y="88" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" letterSpacing="1">FAYSAL</text>
      </svg>
    );
  }

  // 8. UBL (United Bank Limited)
  if (norm.includes('ubl') || norm.includes('united bank')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,84,166,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#0054A6" />
        <path d="M22 30 C38 18 62 18 78 30 C66 22 48 22 34 30 Z" fill="#FF9E1B" />
        <text x="50" y="62" textAnchor="middle" fill="#FFFFFF" fontSize="26" fontWeight="900" letterSpacing="1.5" fontFamily="Arial, sans-serif">UBL</text>
        <text x="50" y="78" textAnchor="middle" fill="#FF9E1B" fontSize="8" fontWeight="700" letterSpacing="0.8">BANK</text>
      </svg>
    );
  }

  // 9. Bank of Punjab (BOP)
  if (norm.includes('punjab') || norm.includes('bop')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(155,27,30,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#9B1B1E" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="2"/>
        <path d="M50 18 C42 28 38 38 44 46 C46 40 50 36 52 33 C54 38 58 42 56 48 C62 40 58 28 50 18 Z" fill="#D4AF37"/>
        <rect x="22" y="52" width="56" height="22" rx="4" fill="#FFFFFF"/>
        <text x="50" y="69" textAnchor="middle" fill="#9B1B1E" fontSize="18" fontWeight="900" letterSpacing="1" fontFamily="Arial, sans-serif">BOP</text>
        <text x="50" y="87" textAnchor="middle" fill="#D4AF37" fontSize="7" fontWeight="800" letterSpacing="0.5">PUNJAB BANK</text>
      </svg>
    );
  }

  // 10. Habib Metropolitan Bank
  if (norm.includes('metropolitan') || norm.includes('metro')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(26,60,110,0.25)' }}
      >
        <rect width="100" height="100" rx="20" fill="#1A3C6E" />
        <polygon points="50,16 78,36 70,70 50,82 30,70 22,36" fill="none" stroke="#C59B27" strokeWidth="2.5"/>
        <circle cx="50" cy="44" r="14" fill="#C59B27"/>
        <polygon points="50,34 57,44 50,54 43,44" fill="#1A3C6E"/>
        <text x="50" y="47" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900">H</text>
        <text x="50" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" letterSpacing="0.5">HABIB</text>
        <text x="50" y="78" textAnchor="middle" fill="#C59B27" fontSize="6" fontWeight="800" letterSpacing="0.8">METRO</text>
      </svg>
    );
  }

  // 11. EasyPaisa
  if (norm.includes('easypaisa') || norm.includes('easy paisa')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,168,89,0.25)' }}
      >
        <rect width="100" height="100" rx="24" fill="#00A859" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#74D14C" strokeWidth="2" opacity="0.6"/>
        <path d="M50 28 C37 28 28 37 28 50 C28 63 37 72 50 72 C61 72 69 65 71 56 L58 56 C56 60 53 62 50 62 C43 62 38 57 38 50 L72 50 C72 48 72 46 72 44 C72 35 63 28 50 28 Z M39 44 C41 38 45 35 50 35 C55 35 59 38 61 44 L39 44 Z" fill="#FFFFFF" />
        <circle cx="68" cy="28" r="7" fill="#74D14C"/>
        <text x="50" y="87" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" letterSpacing="0.8">easypaisa</text>
      </svg>
    );
  }

  // 12. JazzCash
  if (norm.includes('jazzcash') || norm.includes('jazz cash')) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(226,30,38,0.25)' }}
      >
        <rect width="100" height="100" rx="24" fill="#E21E26" />
        <circle cx="50" cy="42" r="24" fill="#FFC20E" />
        <circle cx="46" cy="40" r="20" fill="#E21E26" />
        <circle cx="53" cy="44" r="15" fill="#FFC20E" />
        <circle cx="51" cy="43" r="11" fill="#E21E26" />
        <circle cx="55" cy="45" r="6" fill="#FFFFFF" />
        <text x="50" y="78" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" letterSpacing="0.5" fontFamily="Arial, sans-serif">Jazz<tspan fill="#FFC20E">Cash</tspan></text>
      </svg>
    );
  }

  // Generic fallback with initials
  const initials = accountName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: size * 0.22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <rect width="100" height="100" rx="20" fill={type === 'wallet' ? '#2A6F97' : '#014F86'} />
      <text x="50" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="900" letterSpacing="1">
        {initials || (type === 'wallet' ? 'W' : 'B')}
      </text>
    </svg>
  );
};

export default BankLogo;
