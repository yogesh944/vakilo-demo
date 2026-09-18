import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import BreakingNewsBadge from "./BreakingNewsBadge";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=1920&q=80",
    kicker: "The Rule of Law",
  },
  {
    image:
      "https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&w=1920&q=80",
    kicker: "Decisions That Matter",
  },
  {
    image:
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1920&q=80",
    kicker: "Knowledge, Organized",
  },
  {
    image:
      "https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&w=1920&q=80",
    kicker: "Agreements, Secured",
  },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused]);

  const goTo = (i: number) => setActive((i + SLIDES.length) % SLIDES.length);

  return (
    <section
      id="home"
      className="relative flex min-h-[92vh] items-center overflow-hidden border-b border-[#DED7CA]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes vakilo-hero-fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes vakilo-slide-zoom {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
        .vakilo-hero-fade {
          opacity: 0;
          animation: vakilo-hero-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) forwards;
        }
      `}</style>

      {/* ===== Background slides ===== */}
      <div className="absolute inset-0">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.image}
            className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
            style={{ opacity: active === i ? 1 : 0 }}
          >
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${slide.image})`,
                animation:
                  active === i ? "vakilo-slide-zoom 6.5s ease-out forwards" : "none",
              }}
            />
          </div>
        ))}
        {/* readability + brand-tinted overlay */}
        <div className="absolute inset-0 bg-[#171717]/70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(23,23,23,0.55) 0%, rgba(23,23,23,0.35) 45%, rgba(23,23,23,0.85) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px circle at 12% 20%, rgba(201,162,39,0.16), transparent 60%)",
          }}
        />
      </div>

      {/* ===== Foreground content ===== */}
      <div className="relative mx-auto w-full max-w-7xl px-6 py-24 md:px-10 lg:px-16">
        <div className="max-w-3xl">
          <div
            className="vakilo-hero-fade"
            style={{ animationDelay: loaded ? "0ms" : "9999s" }}
          >
            <BreakingNewsBadge text="LEGAL HELP, REIMAGINED" />
          </div>

          <p
            key={SLIDES[active].kicker}
            className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#D6B43A] transition-opacity duration-700"
          >
            {SLIDES[active].kicker}
          </p>

          <h1
            className="vakilo-hero-fade mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl"
            style={{ animationDelay: loaded ? "120ms" : "9999s" }}
          >
            Legal help that
            <span className="block text-[#D6B43A]">works for you.</span>
          </h1>

          <p
            className="vakilo-hero-fade mt-7 max-w-xl text-base leading-8 text-[#E4DFD5] md:text-lg"
            style={{ animationDelay: loaded ? "240ms" : "9999s" }}
          >
            Vakilo makes legal assistance simpler. Understand your legal
            problem, find the right lawyer, manage your case, and stay
            informed — all in one place.
          </p>

          <div
            className="vakilo-hero-fade mt-9 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: loaded ? "360ms" : "9999s" }}
          >
            <Link
              to="/login"
              className="group flex items-center justify-center gap-2 bg-[#C9A227] px-7 py-4 text-sm font-semibold uppercase tracking-wider text-[#171717] transition duration-300 hover:bg-[#D6B43A] hover:shadow-[0_10px_30px_-8px_rgba(201,162,39,0.6)]"
            >
              Get Legal Help
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

            <Link
              to="/signup"
              className="flex items-center justify-center border border-white/40 bg-white/5 px-7 py-4 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-sm transition duration-300 hover:border-white hover:bg-white/10"
            >
              Find a Lawyer
            </Link>
          </div>

          <div
            className="vakilo-hero-fade mt-10 flex items-center gap-6 text-xs uppercase tracking-wider text-[#C7C1B6]"
            style={{ animationDelay: loaded ? "480ms" : "9999s" }}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#D6B43A]" />
              Verified &amp; vetted lawyers
            </span>
            <span className="hidden h-4 w-px bg-white/25 sm:block" />
            <span className="hidden sm:block">850+ practicing across India</span>
          </div>
        </div>
      </div>

      {/* ===== Slider controls ===== */}
      <div className="absolute bottom-8 left-6 right-6 z-10 flex items-center justify-between md:left-10 md:right-10 lg:left-16 lg:right-16">
        <div className="flex items-center gap-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className="h-1 overflow-hidden bg-white/25 transition-all duration-300"
              style={{ width: active === i ? "40px" : "16px" }}
            >
              {active === i && (
                <span
                  key={active}
                  className="block h-full bg-[#D6B43A]"
                  style={{
                    animation: paused ? "none" : "vakilo-progress 6s linear forwards",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Previous slide"
            onClick={() => goTo(active - 1)}
            className="flex h-10 w-10 items-center justify-center border border-white/30 text-white transition hover:border-[#D6B43A] hover:text-[#D6B43A]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next slide"
            onClick={() => goTo(active + 1)}
            className="flex h-10 w-10 items-center justify-center border border-white/30 text-white transition hover:border-[#D6B43A] hover:text-[#D6B43A]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes vakilo-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}
