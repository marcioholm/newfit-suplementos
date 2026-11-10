import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, X } from 'lucide-react';

interface PinModalProps {
  correctPin: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

interface KeyConfig {
  digit: string;
  letters: string;
}

const KEYPAD: KeyConfig[] = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
];

export const PinModal: React.FC<PinModalProps> = ({
  correctPin,
  isOpen,
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // O PIN vem da variável VITE_ADMIN_PIN (4 dígitos). Sem ela, nada é liberado.
  const isPinConfigured = /^\d{4}$/.test(correctPin);

  const handleDigit = useCallback((digit: string) => {
    // Feedback visual momentâneo na tecla
    setPressedKey(digit);
    setTimeout(() => setPressedKey(null), 120);

    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      setError(false);

      if (nextPin.length === 4) {
        if (isPinConfigured && nextPin === correctPin) {
          setTimeout(() => {
            onSuccess();
            setPin('');
          }, 120);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
      return nextPin;
    });
  }, [correctPin, isPinConfigured, onSuccess]);

  const handleBackspace = useCallback(() => {
    setPressedKey('backspace');
    setTimeout(() => setPressedKey(null), 120);
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  // Suporte a teclado físico (Mac, PC, teclado numérico)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos de sistema com Cmd/Ctrl (ex: Cmd+R)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  // Reseta estado ao abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError(false);
      setPressedKey(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-[#1A1B20]/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-white/[0.12] rounded-[36px] w-full max-w-[340px] p-7 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-6 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header no estilo iOS Passcode */}
        <div className="flex flex-col items-center text-center space-y-2 w-full pt-1">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#D97706] dark:text-[#F5A623] shadow-xs">
            <Lock className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Digitar Código
            </h3>
            {isPinConfigured ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Digite o PIN de 4 dígitos ou use o teclado
              </p>
            ) : (
              <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 max-w-[240px]">
                PIN não configurado. Defina VITE_ADMIN_PIN na Vercel.
              </p>
            )}
          </div>
        </div>

        {/* 4 Indicadores (Dots) com animação iOS Shake em erro */}
        <div className={`flex items-center gap-4 py-1 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  error
                    ? 'border-2 border-red-500 bg-red-500 scale-105'
                    : isFilled
                    ? 'border-2 border-[#F5A623] bg-[#F5A623] scale-110 shadow-sm shadow-amber-500/40'
                    : 'border-2 border-zinc-300 dark:border-white/30 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Teclado Numérico Circular Estilo iPhone */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 w-full justify-items-center pt-1">
          
          {/* Números 1 a 9 */}
          {KEYPAD.map(({ digit, letters }) => {
            const isPressed = pressedKey === digit;
            return (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className={`w-18 h-18 sm:w-[72px] sm:h-[72px] rounded-full flex flex-col items-center justify-center transition-all duration-100 ${
                  isPressed
                    ? 'bg-amber-500/30 dark:bg-amber-400/30 scale-95 border-amber-500'
                    : 'bg-zinc-100 hover:bg-zinc-200/90 active:bg-zinc-300 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:active:bg-white/[0.2] active:scale-95'
                } border border-zinc-200/80 dark:border-white/[0.08] shadow-xs cursor-pointer`}
              >
                <span className="text-2xl sm:text-[26px] font-semibold text-zinc-900 dark:text-white leading-none font-sans">
                  {digit}
                </span>
                {letters ? (
                  <span className="text-[8px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
                    {letters}
                  </span>
                ) : (
                  <span className="h-2.5" />
                )}
              </button>
            );
          })}

          {/* Linha Inferior: Cancelar / 0 / Apagar */}
          <button
            type="button"
            onClick={onClose}
            className="w-18 h-18 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white active:scale-95 transition"
          >
            Cancelar
          </button>

          {/* Tecla 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className={`w-18 h-18 sm:w-[72px] sm:h-[72px] rounded-full flex flex-col items-center justify-center transition-all duration-100 ${
              pressedKey === '0'
                ? 'bg-amber-500/30 dark:bg-amber-400/30 scale-95 border-amber-500'
                : 'bg-zinc-100 hover:bg-zinc-200/90 active:bg-zinc-300 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:active:bg-white/[0.2] active:scale-95'
            } border border-zinc-200/80 dark:border-white/[0.08] shadow-xs cursor-pointer`}
          >
            <span className="text-2xl sm:text-[26px] font-semibold text-zinc-900 dark:text-white leading-none font-sans">
              0
            </span>
          </button>

          {/* Tecla Apagar / Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Apagar dígito"
            className={`w-18 h-18 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-100 ${
              pressedKey === 'backspace'
                ? 'bg-zinc-300 dark:bg-white/20 scale-95'
                : 'active:scale-95 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>

        </div>

      </div>
    </div>
  );
};
