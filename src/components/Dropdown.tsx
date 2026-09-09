"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

export type DropdownOption = { value: string; label: string; hint?: string; swatch?: string };

/** A themed select-only combobox. Its popup uses the top layer, even in a dialog. */
export function Dropdown({ value, onChange, options, placeholder = "Select…", disabled, id,
  "aria-label": label, className, triggerClassName, align = "start",
}: { value: string; onChange: (value: string) => void; options: DropdownOption[]; placeholder?: string;
  disabled?: boolean; id?: string; "aria-label"?: string; className?: string; triggerClassName?: string; align?: "start" | "end" }) {
  const uid = useId();
  const triggerId = id ?? `choice-${uid}`;
  const listId = `${triggerId}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef({ term: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const selected = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open || !popup.current || !trigger.current) return;
    const menu = popup.current;
    const button = trigger.current;
    const place = () => {
      const r = button.getBoundingClientRect();
      const vv = window.visualViewport;
      const top = vv?.offsetTop ?? 0;
      const left = vv?.offsetLeft ?? 0;
      const vw = vv?.width ?? innerWidth;
      const vh = vv?.height ?? innerHeight;
      const width = Math.min(Math.max(r.width, 224), vw - 24);
      const below = top + vh - r.bottom - 16;
      const above = r.top - top - 16;
      const up = below < Math.min(300, options.length * 48 + 12) && above > below;
      const height = Math.min(320, Math.max(64, up ? above : below));
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${height}px`;
      menu.style.left = `${Math.max(left + 12, Math.min(align === "end" ? r.right - width : r.left, left + vw - width - 12))}px`;
      menu.style.top = `${up ? Math.max(top + 12, r.top - Math.min(menu.scrollHeight, height) - 7) : r.bottom + 7}px`;
      menu.dataset.side = up ? "top" : "bottom";
    };
    // Popover paints our own HTML; it is not an OS select or a native menu.
    menu.showPopover?.();
    place();
    const frame = requestAnimationFrame(place);
    const dismiss = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node) && !button.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      cancelAnimationFrame(frame);
      menu.hidePopover?.();
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, options.length, align]);

  useEffect(() => {
    const list = popup.current;
    const option = list?.children[active] as HTMLElement | undefined;
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [open, active]);

  const show = () => { if (!disabled && options.length) { setHost(trigger.current?.closest("dialog") ?? document.body); setActive(Math.max(0, selected)); setOpen(true); } };
  const commit = (index: number) => { if (options[index]) onChange(options[index].value); setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const keys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); if (open) commit(active); else show(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(); if (event.key === "End") setActive(options.length - 1); return; }
      setActive((index) => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current.term = now - search.current.at > 700 ? event.key : search.current.term + event.key;
      search.current.at = now;
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(search.current.term.toLowerCase()));
      if (match >= 0) { if (!open) show(); setActive(match); }
    }
  };
  return <div className={className}>
    <button ref={trigger} id={triggerId} type="button" role="combobox" aria-label={label ?? placeholder}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled || options.length === 0}
      className={triggerClassName ?? "dropdown-trigger control"} onKeyDown={keys} onBlur={(event) => { if (!popup.current?.contains(event.relatedTarget as Node)) setOpen(false); }} onClick={() => open ? setOpen(false) : show()}>
      {options[selected]?.swatch && <span className="option-swatch" style={{ background: options[selected].swatch }} />}
      <span className="dropdown-value">{options[selected]?.label ?? placeholder}</span>
      <Icon className="dropdown-chevron" name="chevron" size={15} />
    </button>
    {open && host && createPortal(
      <div ref={popup} id={listId} popover="manual" role="listbox" aria-label={label ?? placeholder} className="dropdown-popup">
        {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={option.value === value}
          className="dropdown-option" data-active={index === active} onPointerEnter={() => setActive(index)}
          onPointerDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); commit(index); }}>
          {option.swatch && <span className="option-swatch" style={{ background: option.swatch }} />}
          <span className="option-copy"><span>{option.label}</span>{option.hint && <small>{option.hint}</small>}</span>
          {option.value === value && <Icon name="check" size={17} />}
        </div>)}
      </div>, host)}
  </div>;
}
