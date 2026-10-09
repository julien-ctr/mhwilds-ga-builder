import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Card content, rendered lazily when the card opens. */
  content: () => ReactNode;
  children: ReactNode;
  className?: string;
  /** 'right' keeps the card beside the anchor (used in lists, so it does not hide the next rows). */
  placement?: 'below' | 'right';
  /** Whether the anchor is reachable with Tab (disable inside already-interactive rows). */
  focusable?: boolean;
}

const GAP = 8;
const MARGIN = 8;

/**
 * Wraps an element and shows a floating card on hover or focus.
 * Rendered in a portal with fixed positioning so scrollable containers never clip it.
 */
export function HoverCard({ content, children, className, placement = 'below', focusable = true }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !cardRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const t = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (placement === 'right' && a.right + GAP + t.width <= vw - MARGIN) {
      setPos({ left: a.right + GAP, top: Math.min(Math.max(MARGIN, a.top), Math.max(MARGIN, vh - t.height - MARGIN)) });
      return;
    }
    // Prefer below the anchor, flip above if it does not fit.
    let top = a.bottom + GAP;
    if (top + t.height > vh - MARGIN && a.top - GAP - t.height >= MARGIN) top = a.top - GAP - t.height;
    const left = Math.min(Math.max(MARGIN, a.left), Math.max(MARGIN, vw - t.width - MARGIN));
    setPos({ top, left });
  }, [open, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  const show = () => {
    setPos(null);
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={anchorRef}
      className={`tt-anchor ${className ?? ''}`}
      tabIndex={focusable ? 0 : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={cardRef}
            className="tooltip"
            role="tooltip"
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          >
            {content()}
          </div>,
          document.body,
        )}
    </span>
  );
}
