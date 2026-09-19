import { LogoMark } from "@/components/brand/Logo";
import { HeroHeadline } from "@/components/landing/HeroHeadline";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { Marquee } from "@/components/landing/Marquee";
import { LandingMotion, Reveal, Tilt } from "@/components/landing/Motion";
import { ScoreDemo } from "@/components/landing/ScoreDemo";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { CollaborationGraph } from "@/components/network/CollaborationGraph";
import { hubLayout } from "@/components/network/layouts";
import { ButtonLink } from "@/components/ui/Button";

const TICKER = ["Built for the AWS hackathon", "Describe your idea", "Meet the people who fit", "See why they fit", "Form the team", "Find what's still missing"];

const SKILLS = ["Python", "Machine Learning", "Computer Vision", "React", "UI/UX", "Event Management", "Marketing", "Backend", "Data Analysis", "Mobile", "Product Design", "Operations"];

const STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "Write it the way you'd tell a friend. radius works out the skills and roles it needs.",
    tone: "bg-tomato",
    rotate: -1.5,
    fragment: (
      <p className="rounded-card border-2 border-ink bg-surface p-4 font-mono text-[13px] leading-relaxed">
        I want to build an AI system that analyzes football matches using computer vision…
        <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-ink" aria-hidden="true" />
      </p>
    ),
  },
  {
    n: "02",
    title: "Meet the people who fit",
    body: "Search finds them, a transparent score ranks them, and a short note says why each one fits.",
    tone: "bg-mustard",
    rotate: 1,
    fragment: (
      <div className="flex items-center gap-3 rounded-card border-2 border-ink bg-surface p-3">
        <span className="flex size-9 items-center justify-center rounded-full border-2 border-ink bg-pink font-display text-xs font-extrabold">RS</span>
        <span className="flex-1">
          <span className="block text-sm font-bold">Rahul Sharma</span>
          <span className="block font-mono text-[11px]">Python · ML · React</span>
        </span>
        <span className="rounded-btn border-2 border-ink bg-mint px-2 py-0.5 font-mono text-xs font-bold">fits</span>
      </div>
    ),
  },
  {
    n: "03",
    title: "See what's still missing",
    body: "As people join, radius shows the gap that's left, and who could fill it.",
    tone: "bg-teal",
    rotate: -1,
    fragment: (
      <div className="flex flex-wrap gap-2">
        {["Python ✓", "ML ✓", "React ✓"].map((s) => (
          <span key={s} className="rounded-btn border-2 border-ink bg-surface px-2.5 py-1 font-mono text-xs font-bold">
            {s}
          </span>
        ))}
        <span className="rounded-btn border-2 border-dashed border-ink bg-mustard px-2.5 py-1 font-mono text-xs font-bold">Vision?</span>
      </div>
    ),
  },
];

const AWS_SERVICES = [
  ["AWS Amplify", "Delivers this app", "bg-mint"],
  ["Amazon API Gateway", "The front door to the API", "bg-sky"],
  ["AWS Lambda", "Runs the product logic", "bg-mustard"],
  ["Amazon DynamoDB", "Stores people, projects and teams", "bg-lilac"],
  ["Amazon Bedrock", "Understands ideas and explains matches", "bg-pink"],
  ["Amazon OpenSearch", "Finds people with the skills you need", "bg-teal"],
  ["Amazon S3", "Keeps profile and project images", "bg-tomato"],
  ["Amazon CloudWatch", "Watches latency, errors and AI calls", "bg-surface"],
] as const;

function GapGraph() {
  const graph = hubLayout(
    { id: "project", label: "Your idea", kind: "project" },
    [
      { label: "Python", kind: "skill", checked: true },
      { label: "Machine Learning", kind: "skill", checked: true },
      { label: "React", kind: "skill", checked: true },
      { label: "Computer Vision", kind: "missing" },
    ],
    { width: 440, height: 320, radius: 115, startDeg: -150 },
  );
  return <CollaborationGraph {...graph} width={440} height={320} title="A team with Python, Machine Learning and React covered, and Computer Vision missing" />;
}

export default function LandingPage() {
  return (
    <LandingMotion>
      <div className="overflow-x-clip">
        <div className="border-b-[2.5px] border-ink bg-ink py-2 font-mono text-xs font-bold uppercase tracking-wide text-canvas">
          <Marquee items={TICKER} duration={40} separator="★" />
        </div>
        <PublicHeader />

        <main>
          {/* Hero */}
          <section className="dot-grid border-b-[2.5px] border-ink">
            <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:pb-24 lg:pt-20">
              <div>
                <Reveal distance={16}>
                  <span className="inline-block -rotate-2 rounded-btn border-2 border-ink bg-lilac px-3 py-1 font-mono text-xs font-bold uppercase shadow-brutal-sm">★ A collaboration network</span>
                </Reveal>
                <div className="mt-7">
                  <HeroHeadline />
                </div>
                <Reveal delay={0.6} distance={16}>
                  <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-soft">
                    Describe what you want to build. Find people who can help make it happen. Build the team you need.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-4">
                    <ButtonLink href="/login?next=/projects/new" size="lg" variant="pop">
                      Start building →
                    </ButtonLink>
                    <ButtonLink href="/login?next=/discover" size="lg" variant="secondary">
                      Explore people
                    </ButtonLink>
                  </div>
                  <div className="mt-10 flex items-center gap-3">
                    <div className="flex -space-x-2" aria-hidden="true">
                      {[
                        ["AM", "bg-mustard"],
                        ["RS", "bg-pink"],
                        ["PN", "bg-mint"],
                        ["AR", "bg-sky"],
                        ["MI", "bg-lilac"],
                      ].map(([i, c]) => (
                        <span key={i} className={`flex size-9 items-center justify-center rounded-full border-2 border-ink font-display text-xs font-extrabold ${c}`}>
                          {i}
                        </span>
                      ))}
                    </div>
                    <p className="font-mono text-xs font-bold uppercase">25 builders in the demo network</p>
                  </div>
                </Reveal>
              </div>
              <HeroVisual />
            </div>
          </section>

          {/* Skills ticker */}
          <div className="relative z-10 -my-1 -rotate-1 border-y-[2.5px] border-ink bg-mustard py-3 font-display text-xl font-extrabold">
            <Marquee items={SKILLS} duration={30} separator="✦" />
          </div>

          {/* The loop */}
          <section id="how-it-works" className="scroll-mt-24">
            <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:px-8">
              <Reveal>
                <p className="eyebrow mb-4">How it works</p>
                <h2 className="max-w-2xl text-[40px] font-extrabold leading-[1.02] sm:text-[56px]">
                  Idea <span className="text-tomato">→</span> people <span className="text-tomato">→</span> team.
                </h2>
              </Reveal>
              <ol className="mt-14 grid gap-8 md:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.n}>
                    <Reveal delay={i * 0.12}>
                      <Tilt rotate={step.rotate} className={`h-full rounded-panel border-[2.5px] border-ink p-6 shadow-brutal ${step.tone}`}>
                        <p className="font-mono text-sm font-bold">{step.n}</p>
                        <h3 className="mt-3 text-2xl font-extrabold leading-tight">{step.title}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed">{step.body}</p>
                        <div className="mt-6">{step.fragment}</div>
                      </Tilt>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Matching */}
          <section id="matching" className="scroll-mt-24 border-y-[2.5px] border-ink bg-lilac/50">
            <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
              <Reveal>
                <p className="eyebrow mb-4 !text-ink">Matching</p>
                <h2 className="text-[40px] font-extrabold leading-[1.02] sm:text-[52px]">Matches you can check.</h2>
                <ul className="mt-8 space-y-5">
                  {[
                    ["Scored, not guessed", "Five visible factors decide the score. The same profile always gets the same number."],
                    ["Explained in plain words", "A short note says why each person fits, written only from what's on their profile."],
                    ["Built around the gap", "Once someone joins, the next search favors the skills your team still lacks."],
                  ].map(([title, body]) => (
                    <li key={title} className="flex gap-4">
                      <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-mustard font-bold" aria-hidden="true">
                        ✓
                      </span>
                      <span>
                        <span className="block text-lg font-bold">{title}</span>
                        <span className="block text-[15px] leading-relaxed text-ink-soft">{body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.15}>
                <ScoreDemo />
              </Reveal>
            </div>
          </section>

          {/* Team gap */}
          <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
            <Reveal className="order-2 lg:order-1">
              <div className="dot-grid rounded-panel border-[2.5px] border-ink bg-surface p-4 shadow-brutal-lg">
                <GapGraph />
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2" delay={0.1}>
              <p className="eyebrow mb-4">Team check</p>
              <h2 className="text-[40px] font-extrabold leading-[1.02] sm:text-[52px]">
                Know exactly who <span className="bg-mustard px-2 [box-decoration-break:clone]">you still need.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
                radius compares everyone on the team with what the idea needs. The missing piece shows up as an empty spot, and one click finds the people who fill it.
              </p>
            </Reveal>
          </section>

          {/* AWS */}
          <section id="under-the-hood" className="scroll-mt-24 border-t-[2.5px] border-ink bg-sunken">
            <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:px-8">
              <Reveal>
                <p className="eyebrow mb-4">Under the hood</p>
                <h2 className="max-w-2xl text-[40px] font-extrabold leading-[1.02] sm:text-[52px]">Powered by AWS.</h2>
                <p className="mt-4 max-w-xl text-lg text-ink-soft">AWS isn&apos;t just the host. It&apos;s how radius stores, searches, computes and understands collaboration.</p>
              </Reveal>
              <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {AWS_SERVICES.map(([name, role, tone], i) => (
                  <li key={name}>
                    <Reveal delay={(i % 4) * 0.07}>
                      <Tilt rotate={i % 2 ? 1 : -1} className={`h-full rounded-card border-[2.5px] border-ink p-5 shadow-brutal ${tone}`}>
                        <p className="font-display text-lg font-extrabold leading-tight">{name}</p>
                        <p className="mt-1 text-sm">{role}</p>
                      </Tilt>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Closing */}
          <section className="border-y-[2.5px] border-ink bg-tomato">
            <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
              <Reveal>
                <h2 className="max-w-2xl text-[42px] font-extrabold leading-[1] sm:text-[60px]">Your next collaborator is already out there.</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <ButtonLink href="/login?next=/projects/new" size="lg">
                  Start building →
                </ButtonLink>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 font-mono text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2">
            <LogoMark size={16} /> radius · a collaboration network for turning ideas into teams
          </p>
          <p>Built for the AWS hackathon · Built with help from AI coding tools</p>
        </footer>
      </div>
    </LandingMotion>
  );
}
