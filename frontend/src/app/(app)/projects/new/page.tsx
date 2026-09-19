"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalysisSteps } from "@/components/projects/AnalysisSteps";
import { ProjectRequirements } from "@/components/projects/ProjectRequirements";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/States";
import { useCurrentUser } from "@/lib/session";
import { api, type Analysis } from "@/services/api";
import { DRAFT_KEY, EXAMPLE_IDEA } from "./draft";

type Stage = { name: "write" } | { name: "analyzing"; projectId: string; analysis?: Analysis } | { name: "revealed"; projectId: string; analysis: Analysis } | { name: "failed"; projectId?: string; error: unknown };

/** An idea started on the dashboard. Read without side effects (React may call initializers twice); cleared once the project exists. */
function readDraft(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing stored.
  }
}

function TeamSizeStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id="team-size-label" className="font-mono text-xs font-bold uppercase">
        Team size
      </span>
      <div role="group" aria-labelledby="team-size-label" className="flex h-10 items-center rounded-btn border-2 border-ink bg-surface shadow-brutal-sm">
        <button type="button" onClick={() => onChange(Math.max(2, value - 1))} className="h-full px-3 text-lg text-muted hover:text-ink" aria-label="Smaller team">
          −
        </button>
        <span className="w-16 text-center text-[15px] tabular-nums" aria-live="polite">
          {value} people
        </span>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} className="h-full px-3 text-lg text-muted hover:text-ink" aria-label="Larger team">
          +
        </button>
      </div>
    </div>
  );
}

function WorkMode({ remote, onChange }: { remote: boolean; onChange: (remote: boolean) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 font-mono text-xs font-bold uppercase">Where</legend>
      <div className="flex h-10 rounded-btn border-2 border-ink bg-surface p-0.5 shadow-brutal-sm">
        {[
          { label: "Remote", value: true },
          { label: "In person", value: false },
        ].map((opt) => (
          <label key={opt.label} className={`flex cursor-pointer items-center rounded-[8px] px-3 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-accent ${remote === opt.value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            <input type="radio" name="work-mode" className="sr-only" checked={remote === opt.value} onChange={() => onChange(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function NewProjectPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(readDraft);
  const [teamSize, setTeamSize] = useState(4);
  const [remote, setRemote] = useState(true);
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [stage, setStage] = useState<Stage>({ name: "write" });

  async function analyze(projectId: string) {
    setStage({ name: "analyzing", projectId });
    try {
      const analysis = await api.analyzeProject(user.userId, projectId);
      setStage({ name: "analyzing", projectId, analysis });
    } catch (error) {
      setStage({ name: "failed", projectId, error });
    }
  }

  async function submit() {
    const next: typeof errors = {};
    if (title.trim().length < 3) next.title = "Give it a short working title, at least 3 characters.";
    if (description.trim().length < 10) next.description = "Tell us a little more: a sentence or two is enough.";
    setErrors(next);
    if (next.title || next.description) return;

    setStage({ name: "analyzing", projectId: "" });
    try {
      const { projectId } = await api.createProject(user.userId, { title: title.trim(), description: description.trim(), teamSize, remote, location: remote ? "" : location.trim() });
      clearDraft();
      await analyze(projectId);
    } catch (error) {
      setStage({ name: "failed", error });
    }
  }

  const onRevealed = useCallback(() => {
    setStage((s) => (s.name === "analyzing" && s.analysis ? { name: "revealed", projectId: s.projectId, analysis: s.analysis } : s));
  }, []);

  if (stage.name === "analyzing") {
    return (
      <PageContainer narrow className="pt-16">
        <AnalysisSteps analysis={stage.analysis} onRevealed={onRevealed} />
        {!stage.analysis && <p className="mt-10 text-[15px] text-muted">Reading your description…</p>}
      </PageContainer>
    );
  }

  if (stage.name === "revealed") {
    return (
      <PageContainer className="pt-14">
        <div className="animate-rise">
          <p className="eyebrow mb-3">{stage.analysis.category}</p>
          <h1 className="text-[36px] font-extrabold leading-tight sm:text-[44px]">{title}</h1>
        </div>
        <div className="mt-10">
          <ProjectRequirements title={title} skills={stage.analysis.skills} roles={stage.analysis.roles} requirements={stage.analysis.requirements} teamSize={teamSize} />
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-8">
          <ButtonLink href={`/projects/${stage.projectId}/people`} size="lg">
            Find collaborators →
          </ButtonLink>
          <Link href={`/projects/${stage.projectId}`} className="text-[15px] font-medium text-muted underline underline-offset-4 hover:text-ink">
            Open the project page
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (stage.name === "failed") {
    const { projectId } = stage;
    return (
      <PageContainer narrow className="pt-16">
        {projectId ? (
          <ErrorState title="We couldn't finish understanding your project." reassurance="Your project is saved. Try the analysis again in a moment." onRetry={() => analyze(projectId)} />
        ) : (
          <ErrorState title="We couldn't create your project." error={stage.error} onRetry={() => setStage({ name: "write" })} />
        )}
        {projectId && (
          <button type="button" onClick={() => router.push(`/projects/${projectId}`)} className="mt-6 text-[15px] text-muted underline underline-offset-4">
            Go to the project page instead
          </button>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <form
        className="pb-10 pt-12 sm:pt-16"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <h1 className="animate-rise text-[40px] font-extrabold leading-[1] sm:text-[60px]">What are you trying to build?</h1>

        <div className="mt-10 animate-rise rounded-panel border-[2.5px] border-ink bg-surface p-6 shadow-brutal-lg [animation-delay:80ms] sm:p-8">
          <label htmlFor="title" className="sr-only">
            Working title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Working title"
            maxLength={120}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="w-full bg-transparent font-display text-2xl font-bold placeholder:text-line-strong focus:outline-none"
          />
          {errors.title && (
            <p id="title-error" className="mt-1 text-[13px] text-danger">
              {errors.title}
            </p>
          )}

          <label htmlFor="description" className="sr-only">
            Describe your idea
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            maxLength={4000}
            placeholder="I want to build an AI system that analyzes football matches using computer vision…"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "description-error" : "description-hint"}
            className="mt-4 w-full resize-y border-b border-line-strong bg-transparent pb-4 text-xl leading-relaxed placeholder:text-muted/60 focus:border-ink focus:outline-none"
          />
          {errors.description ? (
            <p id="description-error" className="mt-1 text-[13px] text-danger">
              {errors.description}
            </p>
          ) : (
            <p id="description-hint" className="mt-2 text-sm text-muted">
              Write it like you&apos;d explain it to a friend: what it does, who it&apos;s for, what makes it hard.{" "}
              <button
                type="button"
                className="ml-1 rounded-btn border-2 border-ink bg-mustard px-2 py-0.5 font-mono text-xs font-bold uppercase text-ink shadow-brutal-sm active:shadow-none"
                onClick={() => {
                  setTitle(EXAMPLE_IDEA.title);
                  setDescription(EXAMPLE_IDEA.description);
                }}
              >
                Use an example
              </button>
            </p>
          )}
        </div>

        <div className="mt-10 flex animate-rise flex-wrap items-end gap-5 [animation-delay:160ms]">
          <TeamSizeStepper value={teamSize} onChange={setTeamSize} />
          <WorkMode remote={remote} onChange={setRemote} />
          {!remote && (
            <div className="w-48">
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={user.location || "City"} />
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center gap-5">
          <Button type="submit" size="lg" variant="pop">
            Find my people →
          </Button>
          <p className="text-sm text-muted">We&apos;ll work out the skills and roles it needs.</p>
        </div>
      </form>
    </PageContainer>
  );
}
