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
      ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-[500px] rounded-none border-l-[2.5px] animate-[fade_240ms_ease-out]"
      : "m-auto w-[calc(100%-32px)] max-w-[540px] rounded-panel border-[2.5px] shadow-brutal-lg animate-rise";

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
      className={`${layout} border-ink bg-surface p-0 text-ink backdrop:bg-ink/40`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <header className="flex items-center justify-between gap-4 border-b-[2.5px] border-ink bg-mustard px-6 py-4">
            <h2 id="modal-title" className="text-xl font-extrabold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="-mr-2 rounded-btn border-2 border-ink bg-surface p-1.5 text-ink shadow-brutal-sm hover:bg-canvas active:shadow-none" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-3 border-t-[2.5px] border-ink bg-canvas px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
