import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect } from 'react';

/**
 * Screen shell. Every screen is a single centred column with a hard max
 * width, so the app looks composed on a phone and on a desktop without two
 * separate layouts.
 */
export function Screen({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-full justify-center">
      <div className={`flex w-full max-w-md flex-col px-6 ${className}`}>{children}</div>
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base =
    'w-full rounded-xl px-5 py-4 text-base font-semibold tracking-tight transition ' +
    'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40';
  const styles = {
    primary: 'bg-accent text-on-accent hover:bg-accent-hot',
    secondary: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2',
    ghost: 'font-medium text-subtle hover:text-ink',
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function Card({
  children,
  className = '',
  tone = 'plain',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'accent' | 'cool';
}) {
  const tones = {
    plain: 'border-line bg-surface',
    accent: 'border-accent-dim bg-accent-wash',
    cool: 'border-cool/40 bg-surface',
  }[tone];
  return <div className={`rounded-2xl border p-4 ${tones} ${className}`}>{children}</div>;
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`label text-subtle ${className}`}>{children}</div>;
}

/** Round icon button — used for close and settings only. */
export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className={`grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Bottom sheet for help and options. Dismissed by scrim, button, or Escape. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-rise pad-bottom relative w-full max-w-md rounded-t-3xl border border-line bg-surface px-6 pt-6 sm:rounded-3xl sm:pb-6"
      >
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
        <div className="mt-6">
          <Button variant="secondary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Segmented control. Used for every either/or setting so they look alike. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-xl border border-line bg-surface p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition ${
              active ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Progress dots for a round. Compact enough for ten of them on a phone. */
export function Dots({ total, index }: { total: number; index: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < index ? 'w-1.5 bg-accent' : i === index ? 'w-4 bg-accent' : 'w-1.5 bg-surface-3'
          }`}
        />
      ))}
    </div>
  );
}
