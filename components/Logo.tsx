export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="TVMIX"
      className={`inline-flex items-center text-[1.45rem] font-black tracking-[-0.06em] sm:text-[1.8rem] ${className}`}
    >
      <span>TV</span>
      <span className="text-cyan">MIX</span>
    </span>
  );
}
