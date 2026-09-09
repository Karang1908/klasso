"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { TemporalInput } from "./TemporalInput";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children, className, as: Tag = "div",
}: { children: ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  return (
    <Tag className={cx(
      "panel", className,
    )}>
      {children}
    </Tag>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary", size = "md", className, type = "button", ...rest
}: ButtonProps) {
  const base =
    "btn inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
    "active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none select-none";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5" };
  const variants = {
    primary: "btn-primary",
    secondary: "bg-surface-2 text-ink hover:bg-line",
    ghost: "text-dim hover:bg-surface-2",
    danger: "bg-danger-soft text-danger hover:brightness-95",
  };
  return <button type={type} className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
}

export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field block">
      <span className="mb-1.5 block text-sm font-semibold text-dim">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

const controlClass =
  "control w-full rounded-xl border border-line px-3 py-2.5 text-ink " +
  "outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 " +
  "placeholder:text-faint";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  if (props.type === "date" || props.type === "time") return <TemporalInput {...props} />;
  return <input {...props} className={cx(controlClass, props.className)} />;
}


export { Dropdown, type DropdownOption } from "./Dropdown";

/**
 * Lead-time slider. One value per reminder type, which reads better than a row
 * of chips when the useful range is continuous rather than a few presets.
 */
export function Slider({
  value, onChange, min = 0, max = 120, step = 5, label, format,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
}) {
  const show = format ? format(value) : `${value} min`;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider-head">
        <span>{label}</span>
        <strong>{show}</strong>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // The filled portion is painted from the value so the track reads at a
        // glance without a second element to keep in sync.
        style={{ ["--slider-fill" as string]: `${pct}%` }}
      />
    </div>
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <textarea {...props} className={cx(controlClass, "min-h-20 resize-y", props.className)} />;
}

export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const group = useId();
  return (
    <LayoutGroup id={group}><div role="tablist" aria-label="View options" className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const index = options.findIndex((option) => option.value === value);
            const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
              : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
            onChange(options[next].value);
            (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
          }}
          className={cx(
            "segment", value === o.value ? "text-ink" : "text-dim",
          )}
        >
          {value === o.value && <motion.span className="segment-marker" layoutId="selection" />}{o.label}
        </button>
      ))}
    </div></LayoutGroup>
  );
}

export function Toggle({
  checked, onChange, label, description, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        {description && <div className="mt-0.5 text-sm text-dim">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        type="button" className="switch-control"
      >
        <span className="switch-track" /><span className="switch-thumb" />
      </button>
    </div>
  );
}

/** Bottom sheet — the natural modal shape on a phone. */
export function Sheet({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{open && <SheetContent key="sheet" onClose={onClose} title={title} footer={footer}>{children}</SheetContent>}</AnimatePresence>, document.body);
}

let sheetLocks = 0;
let previousOverflow = "";

function SheetContent({ onClose, title, children, footer }: { onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    heading.current?.focus({ preventScroll: true });
    if (sheetLocks === 0) previousOverflow = document.body.style.overflow;
    sheetLocks++;
    document.body.style.overflow = "hidden";
    // The visual viewport shrinks with a phone keyboard, unlike the layout viewport.
    const viewport = () => {
      if (!element) return;
      const vv = window.visualViewport;
      element.style.height = `${vv?.height ?? innerHeight}px`;
      element.style.width = `${vv?.width ?? innerWidth}px`;
      element.style.top = `${vv?.offsetTop ?? 0}px`;
      element.style.left = `${vv?.offsetLeft ?? 0}px`;
    };
    viewport();
    window.visualViewport?.addEventListener("resize", viewport);
    window.visualViewport?.addEventListener("scroll", viewport);
    window.addEventListener("resize", viewport);
    return () => {
      element?.close();
      sheetLocks--;
      if (sheetLocks === 0) { document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); }
      window.visualViewport?.removeEventListener("resize", viewport);
      window.visualViewport?.removeEventListener("scroll", viewport);
      window.removeEventListener("resize", viewport);
    };
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} className="app-dialog">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .16 }}
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="sheet-overlay">
      <motion.div initial={{ y: reduced ? 0 : 24 }} animate={{ y: 0 }} exit={{ y: reduced ? 0 : 20, transition: { duration: reduced ? 0 : .16, ease: "easeOut" } }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }} className="sheet-panel">
        <div className="sheet-header">
          <h2 ref={heading} tabIndex={-1} id={titleId}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            type="button" className="sheet-close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && (
          <div className="sheet-footer">{footer}</div>
        )}
      </motion.div>
    </motion.div>
  </dialog>;
}

export function EmptyState({
  icon, title, body, action,
}: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-faint">{icon}</div>}
      <h3 className="font-bold">{title}</h3>
      {body && <p className="max-w-xs text-sm text-dim">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("animate-spin", className)}
      width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Banner({
  tone = "info", children,
}: { tone?: "info" | "warn" | "danger" | "success"; children: ReactNode }) {
  const tones = {
    info: "bg-brand-soft text-brand",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-xl px-3.5 py-2.5 text-sm font-medium", tones[tone])}>
      {children}
    </div>
  );
}
