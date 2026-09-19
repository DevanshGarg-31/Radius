import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { CollaborationGraph } from "@/components/network/CollaborationGraph";
import { HeroGraph } from "@/components/network/HeroGraph";
import { hubLayout } from "@/components/network/layouts";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";

const AWS_SERVICES = [
  ["AWS Amplify", "Delivers this app"],
  ["Amazon API Gateway", "The front door to the API"],
  ["AWS Lambda", "Runs the product logic"],
  ["Amazon DynamoDB", "Stores people, projects, invitations and teams"],
  ["Amazon OpenSearch Service", "Finds people with the skills an idea needs"],
  ["Amazon Bedrock · Claude", "Understands ideas, explains matches, spots team gaps"],
  ["Amazon S3", "Keeps profile and project images"],
  ["Amazon CloudWatch", "Watches latency, errors and every AI call"],
] as const;

function IdeaFragment() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
      <p className="font-display text-[15px] leading-relaxed text-ink-soft">
        I want to build an AI system that analyzes football matches using computer vision…
        <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" aria-hidden="true" />
      </p>
    </div>
  );
}

function PeopleFragment() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar name="Rahul Sharma" seed="u002" size={36} />
        <div>
          <p className="text-[15px] font-semibold leading-tight">Rahul Sharma</p>
          <p className="text-[13px] text-muted">Python · Machine Learning · React</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">Brings machine learning and React, and shares your interest in football and AI.</p>
    </div>
  );
}

function TeamFragment() {
  const graph = hubLayout(
    { id: "p", label: "", kind: "project" },
    [
      { label: "Python", kind: "skill", checked: true },
      { label: "ML", kind: "skill", checked: true },
      { label: "React", kind: "skill", checked: true },
      { label: "Vision", kind: "missing" },
    ],
    { width: 260, height: 150, radius: 58, startDeg: -160 },
  );
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2 shadow-soft">
      <CollaborationGraph {...graph} width={260} height={150} animate={false} title="A team with Python, ML and React covered, and computer vision missing" />
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Describe the idea", body: "Write it the way you'd explain it to a friend. radius works out the skills and roles it needs.", fragment: <IdeaFragment /> },
  { n: "02", title: "Meet the people who fit", body: "Search finds them, a transparent score ranks them, and a short note says why each one fits.", fragment: <PeopleFragment /> },
  { n: "03", title: "See what's still missing", body: "As people join, radius shows the gap that's left, and who could fill it.", fragment: <TeamFragment /> },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div className="animate-rise">
            <p className="eyebrow mb-6">A collaboration network</p>
            <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[60px] xl:text-[64px]">
              You have the idea.
              <br />
              <span className="text-muted lg:whitespace-nowrap">Now find the people.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft">
              Describe what you want to build.
              <br />
              Find people who can help make it happen.
              <br />
              Build the team you need.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login?next=/projects/new" size="lg">
                Start building →
              </ButtonLink>
              <ButtonLink href="/login?next=/discover" size="lg" variant="secondary">
                Explore people
              </ButtonLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[540px]">
            <HeroGraph />
          </div>
        </section>

        {/* The loop */}
        <section id="how-it-works" className="border-y border-line bg-surface/60">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
            <p className="flex items-center gap-3 font-display text-[15px] font-bold tracking-wide" aria-label="Idea, then people, then team">
              IDEA <span className="text-line-strong">→</span> PEOPLE <span className="text-line-strong">→</span> TEAM
            </p>
            <ol className="mt-12 grid gap-12 md:grid-cols-3 md:gap-10">
              {STEPS.map((step) => (
                <li key={step.n} className="flex flex-col">
                  <p className="font-display text-sm font-bold text-muted">{step.n}</p>
                  <h2 className="mt-2 text-2xl font-bold">{step.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
                  <div className="mt-6">{step.fragment}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="text-[34px] font-extrabold leading-tight sm:text-[40px]">Matches you can check.</h2>
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="border-t border-ink pt-4">
                <h3 className="text-lg font-bold">Scored, not guessed</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">Every match score comes from five visible factors: skills, interests, availability, experience and location. The same profile always gets the same score.</p>
              </div>
              <div className="border-t border-ink pt-4">
                <h3 className="text-lg font-bold">Explained in plain words</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">A short note says why each person fits, written only from what&apos;s on their profile, never from invented qualifications.</p>
              </div>
              <div className="border-t border-line-strong pt-4">
                <h3 className="text-lg font-bold">Built around the gap</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">Once someone joins, the next search favors the skills your team still lacks.</p>
              </div>
              <div className="border-t border-line-strong pt-4">
                <h3 className="text-lg font-bold">People first</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">Invitations, not cold messages. Teams form when both sides say yes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AWS */}
        <section id="under-the-hood" className="border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8">
            <div>
              <p className="eyebrow mb-3">Under the hood</p>
              <h2 className="text-[28px] font-extrabold leading-tight">Powered by AWS</h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">AWS isn&apos;t just the host. It&apos;s how radius stores, searches, computes and understands collaboration.</p>
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {AWS_SERVICES.map(([name, role]) => (
                <div key={name} className="border-b border-line py-3.5">
                  <dt className="text-[15px] font-semibold">{name}</dt>
                  <dd className="text-sm text-muted">{role}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
            <h2 className="max-w-xl text-[34px] font-extrabold leading-tight sm:text-[44px]">Your next collaborator is already out there.</h2>
            <Link href="/login?next=/projects/new" className="inline-flex h-12 items-center rounded-btn bg-white px-6 font-medium text-ink hover:bg-canvas">
              Start building →
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <LogoMark size={16} /> radius: a collaboration network for turning ideas into teams.
        </p>
        <p>Built for the AWS hackathon · Built with help from AI coding tools</p>
      </footer>
    </div>
  );
}
