import type { ReactNode } from "react";
import { humanError } from "@/lib/errors";
import { Button } from "./Button";

/** A deliberate loading line: says what the system is doing, never just "Loading". */
export function LoadingState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="animate-fade py-10">
      <p className="flex items-center gap-3 font-mono text-sm font-bold text-ink">
        <span className="flex gap-1" aria-hidden="true">
          <span className="dot-pending size-2.5 rounded-full border-2 border-ink bg-tomato" />
          <span className="dot-pending size-2.5 rounded-full border-2 border-ink bg-mustard [animation-delay:150ms]" />
          <span className="dot-pending size-2.5 rounded-full border-2 border-ink bg-teal [animation-delay:300ms]" />
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
    <div role="alert" className="animate-fade rounded-card border-2 border-ink bg-warm-soft p-5 shadow-brutal-sm">
      <p className="font-display text-lg font-extrabold">{title}</p>
      <p className="mt-1 text-[15px] text-ink-soft">{reassurance ?? humanError(error)}</p>
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
    <div className="animate-fade rounded-panel border-2 border-dashed border-ink bg-surface/60 px-6 py-10 text-center">
      <p className="font-display text-xl font-extrabold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`dot-pending rounded-card border-2 border-ink/15 bg-sunken ${className}`} />;
}
