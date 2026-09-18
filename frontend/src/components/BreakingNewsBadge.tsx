interface BreakingNewsBadgeProps {
  text?: string;
  className?: string;
}

export default function BreakingNewsBadge({
  text = "BREAKING NEWS",
  className = "",
}: BreakingNewsBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#C9A227]" />

      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
        {text}
      </span>
    </div>
  );
}