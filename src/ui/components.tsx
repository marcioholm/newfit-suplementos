import React, { forwardRef, useId } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Loader2, Search, X } from 'lucide-react';
import { spring } from './motion';
import { avatarSrc, initialsAvatar } from '../services/imageService';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ───────────────────────────── Botões ───────────────────────────── */

type ButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const buttonVariant: Record<ButtonVariant, string> = {
  filled: 'bg-tint text-on-tint hover:brightness-[1.04] disabled:bg-fill/20 disabled:text-label-3',
  tinted: 'bg-tint/15 text-tint-text hover:bg-tint/20 disabled:text-label-3 disabled:bg-fill/12',
  gray: 'bg-fill/12 text-label hover:bg-fill/16 disabled:text-label-3',
  plain: 'bg-transparent text-tint-text hover:bg-fill/10 disabled:text-label-3',
  destructive: 'bg-red-fill/12 text-red hover:bg-red-fill/16 disabled:text-label-3'
};

const buttonSize: Record<ButtonSize, string> = {
  lg: 'h-[50px] px-5 rounded-[12px] type-headline gap-2',
  md: 'h-11 px-4 rounded-[10px] type-subhead font-semibold gap-1.5',
  sm: 'h-8 px-3 rounded-full type-footnote font-semibold gap-1'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'gray', size = 'md', icon, loading, fullWidth, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'pressable inline-flex items-center justify-center select-none whitespace-nowrap disabled:cursor-not-allowed',
        buttonVariant[variant],
        buttonSize[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-[1.1em] h-[1.1em] animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

/** Botão circular de ícone (barra de navegação). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'gray' | 'tint' }
>(({ label, tone = 'gray', className, children, ...rest }, ref) => (
  <button
    ref={ref}
    aria-label={label}
    title={label}
    className={cx(
      'pressable w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0',
      tone === 'tint' ? 'bg-tint text-on-tint' : 'bg-fill/12 text-label hover:bg-fill/18',
      className
    )}
    {...rest}
  >
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

/* ─────────────────────────── Cabeçalho de tela ─────────────────────────── */

export const ScreenHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <header className="flex items-end justify-between gap-3 pt-4 lg:pt-8 pb-4">
    <div className="min-w-0">
      <h1 className="type-large-title text-label truncate">{title}</h1>
      {subtitle && <p className="type-subhead text-label-2 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 pb-1 shrink-0">{actions}</div>}
  </header>
);

/* ───────────────────────── Listas agrupadas (Ajustes) ───────────────────────── */

export const Section: React.FC<{
  title?: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, footer, action, className, children }) => (
  <section className={cx('mb-7', className)}>
    {(title || action) && (
      <div className="flex items-end justify-between px-4 pb-1.5 gap-3">
        {title && <h2 className="type-footnote uppercase text-label-2">{title}</h2>}
        {action}
      </div>
    )}
    {children}
    {footer && <div className="type-footnote text-label-2 px-4 pt-1.5">{footer}</div>}
  </section>
);

/** Cartão com linhas separadas por hairline com recuo (estilo inset grouped). */
export const Group: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cx('ios-group bg-surface rounded-card overflow-hidden', className)}>{children}</div>
);

interface RowProps {
  leading?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}

/** Linha de lista. Com onClick/href vira toque com destaque instantâneo. */
export const Row: React.FC<RowProps> = ({
  leading,
  title,
  subtitle,
  trailing,
  chevron,
  onClick,
  href,
  destructive,
  className,
  children,
  ariaLabel
}) => {
  const content = (
    <>
      {leading && <div className="shrink-0 flex items-center">{leading}</div>}
      <div className="ios-row-content flex-1 min-w-0 flex items-center gap-3 min-h-[44px] py-2.5 pr-4">
        {children ?? (
          <div className="flex-1 min-w-0 text-left">
            {title && (
              <div className={cx('type-body truncate', destructive ? 'text-red' : 'text-label')}>{title}</div>
            )}
            {subtitle && <div className="type-footnote text-label-2 truncate mt-0.5">{subtitle}</div>}
          </div>
        )}
        {trailing && <div className="shrink-0 flex items-center gap-2 text-label-2 type-body">{trailing}</div>}
        {chevron && <ChevronRight className="w-[18px] h-[18px] text-label-3 shrink-0 -mr-1" aria-hidden />}
      </div>
    </>
  );

  const base = cx('ios-row w-full flex items-center gap-3 pl-4', className);

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cx(base, 'row-pressable')} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(base, 'row-pressable')} aria-label={ariaLabel}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
};

/** Linha de formulário com rótulo à esquerda (estilo Contatos/Ajustes). */
export const FieldRow: React.FC<{
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  align?: 'center' | 'start';
}> = ({ label, htmlFor, children, hint, error, align = 'center' }) => (
  <div className="ios-row w-full flex pl-4">
    <div
      className={cx(
        'ios-row-content flex-1 min-w-0 flex gap-3 min-h-[44px] py-1 pr-4',
        align === 'center' ? 'items-center' : 'items-start pt-3'
      )}
    >
      <label htmlFor={htmlFor} className="type-body text-label w-[92px] shrink-0">
        {label}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error ? (
          <p className="type-footnote text-red pb-1.5" role="alert">
            {error}
          </p>
        ) : (
          hint && <div className="type-footnote text-label-2 pb-1.5">{hint}</div>
        )}
      </div>
    </div>
  </div>
);

/** Campo de texto "sem moldura" para dentro de FieldRow. */
export const BareInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cx(
        'w-full bg-transparent type-body text-label py-2.5 outline-none focus-visible:outline-none',
        className
      )}
      {...rest}
    />
  )
);
BareInput.displayName = 'BareInput';

/* ───────────────────────── Controle segmentado ───────────────────────── */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('relative grid p-0.5 rounded-[9px] bg-fill/12', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className="relative h-8 px-3 type-footnote font-semibold text-label touch-manipulation"
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[7px] bg-[rgb(var(--seg-thumb))] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Busca ───────────────────────────── */

export const SearchField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Buscar', className }) => (
  <div className={cx('relative', className)}>
    <Search className="w-4 h-4 text-label-2 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-9 rounded-[10px] bg-fill/12 pl-8 pr-8 type-body text-label outline-none [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar busca"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-label-3 text-surface flex items-center justify-center"
      >
        <X className="w-3 h-3" strokeWidth={3} />
      </button>
    )}
  </div>
);

/* ───────────────────────────── Avatar ───────────────────────────── */

export const Avatar: React.FC<{
  personal: { name: string; avatarUrl?: string };
  size?: number;
  ring?: boolean;
  className?: string;
}> = ({ personal, size = 40, ring, className }) => {
  // Foto corrompida ou inválida volta para as iniciais
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    setFailed(false);
    // Imagens data: podem falhar antes do React ouvir o evento de erro
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && personal.avatarUrl) setFailed(true);
  }, [personal.avatarUrl]);
  return (
    <img
      ref={ref}
      src={failed ? initialsAvatar(personal.name) : avatarSrc(personal)}
      onError={() => setFailed(true)}
      alt=""
      width={size}
      height={size}
      className={cx('rounded-full object-cover shrink-0 bg-fill/12', ring && 'ring-2 ring-tint ring-offset-2 ring-offset-surface', className)}
      style={{ width: size, height: size }}
    />
  );
};

/* ───────────────────────────── Selo de status ───────────────────────────── */

export const StatusBadge: React.FC<{ ok: boolean; okLabel?: string; failLabel?: string }> = ({
  ok,
  okLabel = 'Enviado',
  failLabel = 'Não enviado'
}) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 type-caption font-semibold px-2 py-0.5 rounded-full',
      ok ? 'bg-green-fill/15 text-green' : 'bg-red-fill/12 text-red'
    )}
  >
    <span className={cx('w-1.5 h-1.5 rounded-full', ok ? 'bg-green-fill' : 'bg-red-fill')} aria-hidden />
    {ok ? okLabel : failLabel}
  </span>
);

/* ───────────────────────────── Estado vazio ───────────────────────────── */

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center text-center px-6 py-14">
    <div className="w-14 h-14 rounded-full bg-fill/12 text-label-2 flex items-center justify-center mb-4">{icon}</div>
    <h2 className="type-title-3 text-label">{title}</h2>
    <p className="type-subhead text-label-2 mt-1.5 max-w-xs">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export { cx };
