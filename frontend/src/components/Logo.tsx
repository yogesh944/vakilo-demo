interface LogoProps {
  className?: string;
}

export default function Logo({
  className = "",
}: LogoProps) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#C9A227]">
        <span className="font-serif text-xl font-bold text-[#C9A227]">
          V
        </span>
      </div>

      <div className="flex flex-col leading-none">
        <span className="font-serif text-2xl font-bold tracking-wide text-[#171717]">
          VAKILO
        </span>

        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-[#8A6D1D]">
          Legal Platform
        </span>
      </div>
    </div>
  );
}