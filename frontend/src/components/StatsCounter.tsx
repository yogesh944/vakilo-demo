import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 12000, suffix: "+", label: "Cases Resolved" },
  { value: 850, suffix: "+", label: "Verified Lawyers" },
  { value: 40, suffix: "+", label: "Practice Areas" },
  { value: 98, suffix: "%", label: "Client Satisfaction" },
];

function CountUp({
  target,
  suffix = "",
  isVisible,
}: {
  target: number;
  suffix?: string;
  isVisible: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1800;
    const start = performance.now();
    let frame: number;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, target]);

  return (
    <span className="font-serif text-5xl font-semibold tabular-nums md:text-6xl">
      {value.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export default function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-y border-[#DED7CA] bg-[#171717] text-white"
    >
      {/* faint gold radial glow, matches accent palette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 15% 20%, rgba(201,162,39,0.15), transparent 60%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4 md:px-10 md:py-20 lg:px-16">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="border-l border-white/10 pl-5"
            style={{
              transition: "opacity 0.7s ease, transform 0.7s ease",
              transitionDelay: `${i * 120}ms`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <CountUp target={stat.value} suffix={stat.suffix} isVisible={isVisible} />
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#C9A227]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
