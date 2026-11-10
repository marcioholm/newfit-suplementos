import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { projectMomentum, spring } from './motion';
import { cx } from './components';

/** true em telas de celular (sheet de baixo); false em tablet/desktop (diálogo central). */
export function useIsCompact(query = '(max-width: 639px)') {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Ação à esquerda do título (ex.: "Cancelar"). Sem ela, mostra o X à direita. */
  leading?: React.ReactNode;
  /** Ação à direita do título (ex.: "Salvar"). */
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Largura no desktop */
  size?: 'sm' | 'md' | 'lg';
  /** Rótulo para leitores de tela quando o título é visual */
  ariaLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Sheet: React.FC<SheetProps> = (props) =>
  createPortal(<AnimatePresence>{props.open && <SheetPanel {...props} />}</AnimatePresence>, document.body);

const SheetPanel: React.FC<SheetProps> = ({ onClose, title, leading, trailing, children, size = 'md', ariaLabel }) => {
  const compact = useIsCompact();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2)}`).current;

  // Trava a rolagem da página, foca o painel e devolve o foco ao fechar
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      (first ?? panelRef.current)?.focus({ preventScroll: true });
    }, 30);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  // Esc fecha; Tab fica preso dentro do painel
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Celular: entra e sai por baixo (mesmo caminho). Desktop: escala a partir de 96%.
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : compact
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: spring.default }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: spring.snappy
      };

  const maxW = size === 'sm' ? 'sm:max-w-[400px]' : size === 'lg' ? 'sm:max-w-[640px]' : 'sm:max-w-[520px]';

  const header = (
    <div
      className={cx('shrink-0 relative', compact && !reduceMotion && 'cursor-grab active:cursor-grabbing touch-none')}
      onPointerDown={(e) => {
        // Arrasta só pelo topo; o conteúdo continua rolando normalmente
        if (compact && !reduceMotion && !(e.target as HTMLElement).closest('button, a, input')) {
          dragControls.start(e);
        }
      }}
    >
      {compact && (
        <div className="flex justify-center pt-2" aria-hidden>
          <span className="w-9 h-[5px] rounded-full bg-label-3/60" />
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 h-12">
        <div className="flex justify-start">{leading}</div>
        <h2 id={titleId} className="type-headline text-label text-center truncate max-w-[60vw] sm:max-w-[320px]">
          {title}
        </h2>
        <div className="flex justify-end">
          {trailing ??
            (!leading && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="pressable w-[30px] h-[30px] rounded-full bg-fill/12 text-label-2 flex items-center justify-center"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6" onKeyDown={onKeyDown}>
      {/* Escurece o fundo para focar na tarefa */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgb(var(--scrim) / var(--scrim-alpha))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
        {...panelMotion}
        drag={compact && !reduceMotion ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        // Para baixo segue o dedo 1:1; para cima, resistência elástica
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.06, bottom: 1 }}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
        onDragEnd={(_, info) => {
          const height = panelRef.current?.offsetHeight ?? 600;
          // Decide pelo ponto projetado pelo momento, não pela posição de soltura
          const projected = info.offset.y + projectMomentum(info.velocity.y);
          if (projected > height * 0.4 || info.velocity.y > 900) onClose();
        }}
        className={cx(
          'sheet-panel relative w-full text-label flex flex-col outline-none',
          'max-h-[92dvh] rounded-t-sheet shadow-sheet',
          'sm:rounded-sheet sm:shadow-float sm:max-h-[85vh]',
          maxW
        )}
      >
        {header}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 safe-bottom">{children}</div>
      </motion.div>
    </div>
  );
};

/** Ação de texto para a barra do sheet (Cancelar / Salvar). */
export const SheetAction: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { emphasized?: boolean }
> = ({ emphasized, className, ...rest }) => (
  <button
    type="button"
    className={cx(
      'pressable type-body px-1 -mx-1 h-9 disabled:text-label-3',
      emphasized ? 'font-semibold text-tint-text' : 'text-tint-text',
      className
    )}
    {...rest}
  />
);
