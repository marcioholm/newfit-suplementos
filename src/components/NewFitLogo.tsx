import React from 'react';

/**
 * Logo oficial da New Fit. Troca sozinha entre a versão para fundo claro
 * e para fundo escuro, seguindo a aparência (ou forçada com `variant`).
 */
export const NewFitLogo: React.FC<{ className?: string; variant?: 'auto' | 'dark' | 'light' }> = ({
  className = 'h-10',
  variant = 'auto'
}) => {
  if (variant !== 'auto') {
    return (
      <img
        src={variant === 'dark' ? '/newfit-logo-dark.png' : '/newfit-logo-light.png'}
        alt="New Fit Suplementos"
        className={`${className} w-auto object-contain select-none`}
        draggable={false}
      />
    );
  }
  return (
    <span className="inline-flex" role="img" aria-label="New Fit Suplementos">
      <img src="/newfit-logo-light.png" alt="" className={`only-light ${className} w-auto object-contain select-none`} draggable={false} />
      <img src="/newfit-logo-dark.png" alt="" className={`only-dark ${className} w-auto object-contain select-none`} draggable={false} />
    </span>
  );
};
