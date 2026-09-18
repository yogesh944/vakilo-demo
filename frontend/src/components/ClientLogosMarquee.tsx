const CLIENTS = [
  "Tata Legal",
  "Bajaj Group",
  "Infosys Counsel",
  "HDFC Chambers",
  "Wipro Law",
  "Reliance Advisory",
  "Mahindra Legal",
];

export default function ClientLogosMarquee() {
  return (
    <section className="border-b border-[#DED7CA] bg-[#FBF9F4] py-10">
      <style>{`
        @keyframes vakilo-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .vakilo-marquee-track {
          animation: vakilo-marquee 28s linear infinite;
        }
        .vakilo-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#77716A]">
        Relied on by teams across industries
      </p>

      <div className="relative overflow-hidden border-y border-[#DED7CA] py-6">
        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#FBF9F4] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#FBF9F4] to-transparent" />

        <div className="vakilo-marquee-track flex w-max gap-16">
          {[...CLIENTS, ...CLIENTS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap font-serif text-xl text-[#66615A]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
