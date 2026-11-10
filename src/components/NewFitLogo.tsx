import React from 'react';

interface NewFitLogoProps {
  theme?: 'dark' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const NewFitLogo: React.FC<NewFitLogoProps> = ({
  theme = 'dark',
  size = 'md',
  className = '',
  showText = true
}) => {
  const isDark = theme === 'dark';

  const heights = {
    xs: 'h-6',
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24'
  };

  const logoSrc = isDark ? '/newfit-logo-dark.png' : '/newfit-logo-light.png';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <div className={`relative flex items-center shrink-0 ${heights[size]}`}>
        <img
          src={logoSrc}
          alt="New Fit Suplementos"
          className={`${heights[size]} w-auto object-contain transition-opacity duration-200 drop-shadow-sm select-none`}
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight ${
              size === 'xs' || size === 'sm' ? 'text-sm sm:text-base' : size === 'lg' ? 'text-xl' : size === 'xl' ? 'text-2xl' : 'text-base'
            } ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              NEW FIT
            </span>
            <span className="font-extrabold text-[#F5A623] text-xs sm:text-sm tracking-tight">
              SUPLEMENTOS
            </span>
          </div>
          <span className={`text-[10px] font-mono tracking-wider uppercase mt-0.5 font-semibold ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            PARTNER SYSTEM
          </span>
        </div>
      )}
    </div>
  );
};
