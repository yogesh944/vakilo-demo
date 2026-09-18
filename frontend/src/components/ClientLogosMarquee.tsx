const LAWYERS = [
  { name: "Ananya Mehta", specialty: "Corporate Law", experience: "12 yrs", location: "Mumbai" },
  { name: "Rohan Desai", specialty: "Criminal Defense", experience: "9 yrs", location: "Delhi" },
  { name: "Priya Nair", specialty: "Family Law", experience: "11 yrs", location: "Bengaluru" },
  { name: "Vikram Shah", specialty: "Property Law", experience: "15 yrs", location: "Ahmedabad" },
  { name: "Meera Iyer", specialty: "Civil Litigation", experience: "8 yrs", location: "Chennai" },
];

export default function ClientLogosMarquee() {
  return (
    <section className="border-b border-[#DED7CA] bg-[#FBF9F4] py-12">
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

      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
        Meet trusted legal experts
      </p>
      <p className="mb-7 text-center font-serif text-2xl text-[#193B31] md:text-3xl">
        The right counsel for every kind of case.
      </p>

      <div className="relative overflow-hidden border-y border-[#DED7CA] py-6">
        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#FBF9F4] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#FBF9F4] to-transparent" />

        <div className="vakilo-marquee-track flex w-max gap-4">
          {[...LAWYERS, ...LAWYERS].map((lawyer, i) => (
            <article
              key={`${lawyer.name}-${i}`}
              className="w-[245px] shrink-0 border border-[#DED7CA] bg-[#FFFDF7] p-5 shadow-[0_8px_24px_-18px_rgba(25,59,49,0.45)] sm:w-[280px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#193B31] font-serif text-lg text-[#D6B43A]">
                  {lawyer.name.split(" ").map((part) => part[0]).join("")}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8A6D1D]">
                  Verified
                </span>
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#193B31]">
                {lawyer.name}
              </h3>
              <p className="mt-1 text-sm text-[#66615A]">{lawyer.specialty}</p>
              <div className="mt-4 flex justify-between border-t border-[#E7E0D4] pt-3 text-xs text-[#77716A]">
                <span>{lawyer.experience}</span>
                <span>{lawyer.location}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
