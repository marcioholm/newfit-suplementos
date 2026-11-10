import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { projectMomentum, spring } from './motion';
import { cx } from './components';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  /** Erros ficam até o usuário fechar (o personal pode não ter sido avisado) */
  persistent: boolean;
}

interface ToastApi {
  show: (t: { kind: ToastKind; title: string; message?: string; persistent?: boolean }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi['show']>(
    ({ kind, title, message, persistent }) => {
      const id = nextId.current++;
      const item: ToastItem = { id, kind, title, message, persistent: persistent ?? kind === 'error' };
      setItems((prev) => [...prev.slice(-2), item]);
      if (!item.persistent) window.setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-3 pt-3 safe-top pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduceMotion}
              role={t.kind === 'error' ? 'alert' : 'status'}
              // Entra e sai pelo topo (mesmo caminho)
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.96 }}
              transition={spring.default}
              drag={reduceMotion ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 1, bottom: 0.08 }}
              onDragEnd={(_, info) => {
                // Arremessar para cima dispensa
                if (info.offset.y + projectMomentum(info.velocity.y) < -40) dismiss(t.id);
              }}
              className={cx(
                'pointer-events-auto w-full max-w-[440px] material rounded-[18px] shadow-float',
                'flex items-start gap-3 px-4 py-3 cursor-grab active:cursor-grabbing touch-none'
              )}
            >
              <span
                className={cx(
                  'mt-0.5 shrink-0',
                  t.kind === 'success' ? 'text-green' : t.kind === 'error' ? 'text-red' : 'text-tint-text'
                )}
                aria-hidden
              >
                {t.kind === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : t.kind === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="type-subhead font-semibold text-label">{t.title}</p>
                {t.message && <p className="type-footnote text-label-2 mt-0.5">{t.message}</p>}
              </div>
              {t.persistent && (
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fechar aviso"
                  className="pressable -mr-1 w-7 h-7 rounded-full bg-fill/12 text-label-2 flex items-center justify-center shrink-0"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
