import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Vakilo connected me with a property lawyer within a day. What used to take weeks of asking around took minutes.",
    name: "Ritu Shah",
    role: "Property Dispute, Mumbai",
  },
  {
    quote:
      "The case tracking dashboard meant I always knew where things stood, without chasing my lawyer for updates.",
    name: "Arvind Menon",
    role: "Business Litigation, Bengaluru",
  },
  {
    quote:
      "I was intimidated by the legal process. Vakilo's guidance broke it down into steps I could actually follow.",
    name: "Priya Nair",
    role: "Family Law, Pune",
  },
  {
    quote:
      "Secure video consultations saved me multiple trips to court just for preliminary discussions.",
    name: "Karan Desai",
    role: "Contract Review, Delhi",
  },
];

// Swap this for lucide-react's <Quote /> import if that package isn't
// available in your project — it's the only external icon dependency here.
export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback((i: number) => {
    setIndex(((i % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => goTo(index + 1), 5500);
    return () => clearInterval(id);
  }, [index, isPaused, goTo]);

  // basic swipe support
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) goTo(index + (delta < 0 ? 1 : -1));
    setTouchStartX(null);
  };

  return (
    <section
      className="bg-[#F1ECE2] py-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
              Client Stories
            </p>
            <h2 className="font-serif text-3xl font-semibold md:text-5xl">
              Trusted by people navigating real cases.
            </h2>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => goTo(index - 1)}
              className="flex h-11 w-11 items-center justify-center border border-[#BEB5A5] text-[#171717] transition hover:border-[#8A6D1D] hover:bg-[#171717] hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => goTo(index + 1)}
              className="flex h-11 w-11 items-center justify-center border border-[#BEB5A5] text-[#171717] transition hover:border-[#8A6D1D] hover:bg-[#171717] hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="w-full shrink-0 px-1">
                <div className="grid gap-8 border border-[#CEC6B8] bg-[#FBF9F4] p-8 md:grid-cols-[auto_1fr] md:p-12">
                  <Quote className="h-10 w-10 text-[#C9A227]" strokeWidth={1.5} />
                  <div>
                    <p className="font-serif text-xl leading-relaxed text-[#171717] md:text-2xl">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 border-t border-[#D9D2C5] pt-4">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs uppercase tracking-wider text-[#77716A]">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => goTo(i)}
              className="h-1.5 transition-all duration-300"
              style={{
                width: i === index ? "28px" : "8px",
                backgroundColor: i === index ? "#8A6D1D" : "#CEC6B8",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
