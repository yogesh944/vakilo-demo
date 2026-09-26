"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserPlus,
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Sparkles,
  UserCheck,
  Send,
  Gavel,
  Users,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

type Actor = "Client" | "AI" | "Lawyer" | "Both";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actor: Actor;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Create your account",
    description:
      "Register as a client and step into your own dashboard — built to hold every case you bring to it.",
    icon: UserPlus,
    actor: "Client",
  },
  {
    number: "02",
    title: "Open your dashboard",
    description:
      "New cases, ongoing ones, appointments, and messages all live in one place from day one.",
    icon: LayoutDashboard,
    actor: "Client",
  },
  {
    number: "03",
    title: "Describe your issue",
    description:
      "Start a new case and explain what happened in your own words — no legal jargon required.",
    icon: FileText,
    actor: "Client",
  },
  {
    number: "04",
    title: "Answer 10 quick questions",
    description:
      "The AI asks ten questions shaped around your specific situation to fill in what matters most.",
    icon: MessagesSquare,
    actor: "AI",
  },
  {
    number: "05",
    title: "Get your case summary",
    description:
      "Your answers are turned into a clear, structured summary of the case and what it involves.",
    icon: Sparkles,
    actor: "AI",
  },
  {
    number: "06",
    title: "Meet your best-fit lawyer",
    description:
      "Based on that summary, the AI recommends the lawyer best suited to handle your case.",
    icon: UserCheck,
    actor: "AI",
  },
  {
    number: "07",
    title: "Send an assignment request",
    description:
      "Happy with the match? Send the lawyer a request to take on your case, whenever you're ready.",
    icon: Send,
    actor: "Client",
  },
  {
    number: "08",
    title: "Lawyer accepts the case",
    description:
      "The lawyer reviews the request on their own dashboard and chooses to accept or decline it.",
    icon: Gavel,
    actor: "Lawyer",
  },
  {
    number: "09",
    title: "Work together, in one place",
    description:
      "Appointments, payments, chat, video calls, and IPC references — shared by both sides throughout.",
    icon: Users,
    actor: "Both",
  },
  {
    number: "10",
    title: "Track it to resolution",
    description:
      "Every update, document, and milestone is logged, so you always know where the case stands.",
    icon: CheckCircle2,
    actor: "Both",
  },
];

const actorStyle: Record<Actor, string> = {
  Client: "border-[#C9A227]/40 text-[#C9A227]",
  AI: "border-[#7CA0C9]/40 text-[#8FB4DE]",
  Lawyer: "border-[#B47D5C]/40 text-[#C99977]",
  Both: "border-[#8FAE8B]/40 text-[#9FC299]",
};

export default function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("step-visible");
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex((prev) => (idx > prev ? idx : prev));
          }
        });
      },
      { threshold: 0.45, rootMargin: "0px 0px -10% 0px" }
    );

    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height - viewportH * 0.5;
      const scrolled = viewportH * 0.75 - rect.top;
      const ratio = Math.min(1, Math.max(0, scrolled / total));
      setLineProgress(ratio * 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const ActiveIcon = steps[activeIndex].icon;

  return (
    <section className="w-full bg-[#171717] px-6 py-24 text-white md:px-10 lg:px-16">
      <style>{`
        .step-card {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .step-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .step-card, .step-visible {
            transition: none;
            transform: none;
            opacity: 1;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
            How It Works
          </p>
          <h2 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">
            Legal help, made simpler.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#C8C4BC] md:text-base">
            From your first message to a resolved case, here is the full
            path a case takes through Vakilo — for you and for your lawyer.
          </p>
        </div>

        <div className="grid gap-16 lg:grid-cols-[minmax(0,320px)_1fr]">
          {/* Sticky visual panel */}
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-[#3A3A3A] bg-[#1D1D1D] p-8">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-[11px] font-medium ${actorStyle[steps[activeIndex].actor]}`}
              >
                {steps[activeIndex].actor}
              </span>

              <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#C9A227]/50 bg-[#171717]">
                <ActiveIcon className="h-7 w-7 text-[#C9A227]" strokeWidth={1.5} />
              </div>

              <p className="mt-6 font-serif text-2xl leading-snug">
                {steps[activeIndex].title}
              </p>

              <p className="mt-3 text-sm leading-6 text-[#AAA59C]">
                {steps[activeIndex].description}
              </p>

              <div className="mt-8 flex gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={s.number}
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                      i <= activeIndex ? "bg-[#C9A227]" : "bg-[#3A3A3A]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scrolling timeline */}
          <div ref={trackRef} className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#3A3A3A] lg:left-[23px]">
              <div
                className="w-px bg-[#C9A227] transition-[height] duration-150 ease-out"
                style={{ height: `${lineProgress}%` }}
              />
            </div>

            <div className="flex flex-col gap-10">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    data-index={i}
                    className="step-card relative pl-14 lg:pl-16"
                    style={{ transitionDelay: `${(i % 4) * 60}ms` }}
                  >
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#3A3A3A] bg-[#171717] lg:h-12 lg:w-12">
                      <Icon className="h-4 w-4 text-[#C9A227] lg:h-5 lg:w-5" strokeWidth={1.75} />
                    </div>

                    <div className="rounded-xl border border-[#3A3A3A] bg-[#1D1D1D] p-6 transition hover:border-[#C9A227]/40">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="font-serif text-lg text-[#C9A227]">
                          {step.number}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${actorStyle[step.actor]}`}
                        >
                          {step.actor}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl font-semibold">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#AAA59C]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
