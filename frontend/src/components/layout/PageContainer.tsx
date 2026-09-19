import type { ReactNode } from "react";

export function PageContainer({ children, className = "", narrow = false }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${narrow ? "max-w-[760px]" : "max-w-[1200px]"} ${className}`}>{children}</div>;
}

/** Page heading block: small label, confident title, optional supporting line and actions. */
export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-14">
      <div className="max-w-2xl animate-rise">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[32px] font-extrabold leading-[1.1] sm:text-[40px]">{title}</h1>
        {lede && <p className="mt-3 text-[17px] leading-relaxed text-muted">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
