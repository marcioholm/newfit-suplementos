import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { Delete, Lock } from 'lucide-react';
import { haptic, spring } from '../ui/motion';

interface PinModalProps {
  correctPin: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Tela de código no estilo do iPhone: teclado redondo, pontos e tremida no erro. */
export const PinModal: React.FC<PinModalProps> = (props) =>
  createPortal(<AnimatePresence>{props.isOpen && <PinScreen {...props} />}</AnimatePresence>, document.body);

const PinScreen: React.FC<PinModalProps> = ({ correctPin, onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [dotsRef, animateDots] = useAnimate();
  const reduceMotion = useReducedMotion();

  // O PIN vem da variável VITE_ADMIN_PIN (4 dígitos). Sem ela, nada é liberado.
  const isPinConfigured = /^\d{4}$/.test(correctPin);

  const fail = useCallback(() => {
    setError(true);
    haptic('error');
    if (!reduceMotion && dotsRef.current) {
      animateDots(dotsRef.current, { x: [0, -14, 12, -8, 6, -2, 0] }, { duration: 0.45, ease: 'easeOut' });
    }
    window.setTimeout(() => {
      setPin('');
      setError(false);
    }, 550);
  }, [animateDots, dotsRef, reduceMotion]);

  const press = useCallback(
    (digit: string) => {
      if (error) return;
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          // Valida no próximo frame para os 4 pontos aparecerem preenchidos
          window.setTimeout(() => {
            if (isPinConfigured && next === correctPin) {
              haptic('success');
              onSuccess();
            } else {
              fail();
            }
          }, 50);
        }
        return next;
      });
    },
    [correctPin, error, fail, isPinConfigured, onSuccess]
  );

  const backspace = useCallback(() => {
    if (!error) setPin((p) => p.slice(0, -1));
  }, [error]);

  // Teclado físico também funciona (computador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [press, backspace, onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Acesso restrito"
      className="fixed inset-0 z-[70] material flex flex-col items-center justify-center px-6 safe-top safe-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        className="flex flex-col items-center w-full max-w-[300px]"
        initial={reduceMotion ? false : { scale: 1.04, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduceMotion ? undefined : { scale: 1.04, opacity: 0 }}
        transition={spring.default}
      >
        <Lock className="w-6 h-6 text-label mb-3" aria-hidden />
        <h2 className="type-title-3 text-label">Acesso restrito</h2>
        <p className="type-subhead text-label-2 mt-1 text-center min-h-[1.35em]" aria-live="polite">
          {!isPinConfigured
            ? 'PIN não configurado. Defina VITE_ADMIN_PIN na Vercel e faça um novo deploy.'
            : error
            ? 'PIN incorreto'
            : 'Digite o PIN de 4 dígitos'}
        </p>

        <div ref={dotsRef} className="flex items-center gap-5 my-8" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-[1.5px] transition-colors duration-100 ${
                pin.length > i ? 'bg-label border-label' : 'border-label'
              }`}
            />
          ))}
        </div>
        <span className="sr-only" aria-live="polite">
          {pin.length} de 4 dígitos
        </span>

        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {KEYS.map((k) => (
            <PinKey key={k} label={k} onPress={() => press(k)} />
          ))}
          <span />
          <PinKey label="0" onPress={() => press('0')} />
          <span />
        </div>

        <div className="w-full flex justify-between mt-6 px-2">
          <button type="button" onClick={onClose} className="type-body text-label h-11 px-2 pressable">
            Cancelar
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Apagar dígito"
            className={`type-body text-label h-11 px-2 pressable transition-opacity ${
              pin.length ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <Delete className="w-6 h-6" aria-hidden />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/** Tecla redonda: destaque instantâneo no toque (pointer-down). */
const PinKey: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <button
    type="button"
    onPointerDown={(e) => {
      // Responde no toque, não na soltura
      e.preventDefault();
      onPress();
    }}
    onClick={(e) => {
      // Teclado e leitores de tela (VoiceOver) geram clique sem toque: detail === 0
      if (e.detail === 0) onPress();
    }}
    aria-label={label}
    className="w-[76px] h-[76px] rounded-full bg-fill/20 active:bg-fill/40 text-label text-[2rem] font-normal leading-none flex items-center justify-center select-none touch-manipulation transition-colors duration-75"
  >
    {label}
  </button>
);
