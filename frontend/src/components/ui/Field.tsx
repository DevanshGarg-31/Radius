import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-btn border-2 border-ink bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 shadow-brutal-sm transition-shadow focus:shadow-brutal focus:outline-none aria-invalid:border-danger";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

function FieldShell({ label, hint, error, hideLabel, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "font-mono text-xs font-bold uppercase text-ink"}>
        {label}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string; hideLabel?: boolean };

export function Input({ label, hint, error, hideLabel, className = "", ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel}>
      {(id, describedBy) => <input id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={`${control} h-10 ${className}`} {...rest} />}
    </FieldShell>
  );
}

export function Textarea({ label, hint, error, hideLabel, className = "", ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel}>
      {(id, describedBy) => <textarea id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={`${control} py-2.5 leading-relaxed ${className}`} {...rest} />}
    </FieldShell>
  );
}

export function Select({ label, hint, error, hideLabel, className = "", children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={`${control} h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M3 4.5 6 7.5 9 4.5%22 fill=%22none%22 stroke=%22%236b6b6b%22 stroke-width=%221.5%22/></svg>')] bg-[position:right_12px_center] bg-no-repeat pr-9 ${className}`} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
