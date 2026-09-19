import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { HeroGraph } from "@/components/network/HeroGraph";

/** Shared frame for sign-in, sign-up and onboarding: brand panel on the left, the task on the right. */
export function AuthShell({ title, lede, children, wide = false }: { title: ReactNode; lede?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="dot-grid relative hidden flex-col justify-between border-r-[2.5px] border-ink bg-mustard p-10 lg:flex">
        <Logo />
        <div>
          <p className="font-display text-[44px] font-extrabold leading-[1] tracking-[-0.04em]">
            You have the idea.
            <br />
            Now find the people.
          </p>
          <div className="mt-8 max-w-md rounded-panel border-[2.5px] border-ink bg-surface p-4 shadow-brutal-lg">
            <HeroGraph />
          </div>
        </div>
        <p className="font-mono text-xs font-bold uppercase">Secured by Amazon Cognito</p>
      </aside>
      <main className="flex min-h-dvh flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className={`mx-auto my-auto w-full py-10 ${wide ? "max-w-[680px]" : "max-w-[440px]"}`}>
          <h1 className="animate-rise text-[36px] font-extrabold leading-[1.02] sm:text-[44px]">{title}</h1>
          {lede && <p className="mt-3 animate-rise text-[17px] text-ink-soft">{lede}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** "or" divider between Google and email sign-in. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 font-mono text-xs font-bold uppercase text-muted" aria-hidden="true">
      <span className="h-0.5 flex-1 bg-ink/15" />
      or
      <span className="h-0.5 flex-1 bg-ink/15" />
    </div>
  );
}
