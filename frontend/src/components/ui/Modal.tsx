"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** "center" for dialogs, "side" for a panel sliding in from the right. */
  placement?: "center" | "side";
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Accessible modal built on the native <dialog>: focus is trapped and restored
 * by the browser, Escape closes it, and clicking the backdrop closes it.
 */
export function Modal({ open, onClose, title, placement = "center", children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const layout =
    placement === "side"
      ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-[480px] rounded-none border-l animate-[fade_240ms_ease-out]"
      : "m-auto w-[calc(100%-32px)] max-w-[520px] rounded-panel border animate-rise";

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`${layout} border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/25 backdrop:backdrop-blur-[1px]`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-6">
            <h2 id="modal-title" className="text-xl font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-btn p-2 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
