import React, { useState } from 'react';

export type CountryCode = 'AR' | 'US' | 'BR' | 'PY' | 'EU' | 'GB' | 'CA' | 'IT' | 'ES';

export const WIKIMEDIA_FLAGS: Record<CountryCode, { url: string; name: string }> = {
  AR: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    name: 'Argentina'
  },
  US: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg',
    name: 'United States'
  },
  BR: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg',
    name: 'Brazil'
  },
  PY: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg',
    name: 'Paraguay'
  },
  EU: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg',
    name: 'European Union'
  },
  GB: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Flag_of_the_United_Kingdom_%281-2%29.svg',
    name: 'United Kingdom'
  },
  CA: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg',
    name: 'Canada'
  },
  IT: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg',
    name: 'Italy'
  },
  ES: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg',
    name: 'Spain'
  }
};

export const AGENCY_TO_COUNTRY: Record<string, CountryCode> = {
  NASA: 'US',
  CONAE: 'AR',
  AEB: 'BR',
  AEP: 'PY',
  ESA: 'EU',
  UKSA: 'GB',
  CSA: 'CA',
  ASI: 'IT',
  AEE: 'ES'
};

interface FlagIconProps {
  country?: CountryCode;
  agency?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  country,
  agency,
  className = '',
  size = 'sm'
}) => {
  const [hasError, setHasError] = useState(false);

  const code: CountryCode = country || (agency ? AGENCY_TO_COUNTRY[agency] : 'US') || 'US';
  const flagMeta = WIKIMEDIA_FLAGS[code] || WIKIMEDIA_FLAGS.US;

  const sizeClasses = {
    xs: 'w-5.5 h-3.5',
    sm: 'w-7 h-4.5',
    md: 'w-9 h-6',
    lg: 'w-12 h-8'
  }[size];

  if (hasError) {
    // Fallback minimal badge
    return (
      <span className={`inline-flex items-center justify-center font-mono font-bold text-[9px] text-slate-400 ${sizeClasses} ${className}`}>
        {code}
      </span>
    );
  }

  return (
    <img
      src={flagMeta.url}
      alt={flagMeta.name}
      title={flagMeta.name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`inline-block object-contain select-none shrink-0 ${sizeClasses} ${className}`}
      loading="lazy"
    />
  );
};
