import type { ReactNode } from "react";
import { humanError } from "@/lib/errors";
import { Button } from "./Button";

/** A deliberate loading line: says what the system is doing, never just "Loading". */
export function LoadingState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="animate-fade py-10">
      <p className="flex items-center gap-3 text-[15px] text-muted">
        <span className="flex gap-1" aria-hidden="true">
          <span className="dot-pending size-1.5 rounded-full bg-ink" />
          <span className="dot-pending size-1.5 rounded-full bg-ink [animation-delay:150ms]" />
          <span className="dot-pending size-1.5 rounded-full bg-ink [animation-delay:300ms]" />
        </span>
        {message}
      </p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  error?: unknown;
  reassurance?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, error, reassurance, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="animate-fade border-l-2 border-warm py-2 pl-5">
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-[15px] text-muted">{reassurance ?? humanError(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="animate-fade rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[15px] text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`dot-pending rounded-btn bg-sunken ${className}`} />;
}
