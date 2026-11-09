import React, { useState } from 'react';
import { Lock, Delete, Check, X } from 'lucide-react';

interface PinModalProps {
  correctPin: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  correctPin,
  isOpen,
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onSuccess();
          setPin('');
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#16171B] border border-white/[0.12] rounded-3xl w-full max-w-xs p-6 flex flex-col items-center shadow-2xl animate-in zoom-in-95 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="w-6" />
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623]">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mt-2">Acesso ao Balcão</h3>
            <p className="text-[11px] text-zinc-400">Insira o PIN do Leo (padrão: 1234)</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Indicators (Dots) */}
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                  error
                    ? 'border-red-500 bg-red-500/80 animate-shake'
                    : isFilled
                    ? 'border-[#F5A623] bg-[#F5A623] scale-110 shadow-sm shadow-[#F5A623]/50'
                    : 'border-white/[0.2] bg-zinc-800'
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl bg-[#1C1E24] hover:bg-[#252830] active:scale-95 text-lg font-mono font-bold text-white border border-white/[0.06] transition flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-[#1C1E24] hover:bg-[#252830] active:scale-95 text-lg font-mono font-bold text-white border border-white/[0.06] transition flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-[#1C1E24] hover:bg-[#252830] active:scale-95 text-zinc-400 hover:text-white border border-white/[0.06] transition flex items-center justify-center shadow-sm"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

