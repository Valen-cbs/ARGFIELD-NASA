import React, { useState } from 'react';
import { AgencySource } from '../types';

import nasaLogo from '../assets/agencies/NASA.svg';
import conaeLogo from '../assets/agencies/CONAE.svg';
import aebLogo from '../assets/agencies/AEB.svg';
import aepLogo from '../assets/agencies/AEP.svg';
import esaLogo from '../assets/agencies/ESA.svg';
import uksaLogo from '../assets/agencies/UKSA.svg';
import csaLogo from '../assets/agencies/CSA.svg';
import asiLogo from '../assets/agencies/ASI.svg';
import aeeLogo from '../assets/agencies/AEE.svg';

export const AGENCY_LOGOS: Record<string, string> = {
  NASA: nasaLogo,
  CONAE: conaeLogo,
  AEB: aebLogo,
  AEP: aepLogo,
  ESA: esaLogo,
  UKSA: uksaLogo,
  CSA: csaLogo,
  ASI: asiLogo,
  AEE: aeeLogo,
};

interface AgencyLogoProps {
  agency: AgencySource | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const AgencyLogo: React.FC<AgencyLogoProps> = ({
  agency,
  className = '',
  size = 'sm'
}) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = AGENCY_LOGOS[agency];

  const sizeClasses = {
    xs: 'h-5 w-auto max-w-[38px]',
    sm: 'h-6.5 w-auto max-w-[52px]',
    md: 'h-8 w-auto max-w-[68px]',
    lg: 'h-10 w-auto max-w-[90px]'
  }[size];

  if (!logoUrl || hasError) {
    return (
      <span className={`inline-flex items-center justify-center font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-300 select-none ${className}`}>
        {agency}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${agency} logo`}
      title={`${agency} Space Agency`}
      onError={() => setHasError(true)}
      className={`${sizeClasses} object-contain inline-block select-none shrink-0 ${className}`}
      loading="lazy"
    />
  );
};
