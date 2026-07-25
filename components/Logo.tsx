import type { BrandSettings } from "@/lib/api";

export function Logo({ brand, className = "" }: { brand?: BrandSettings; className?: string }) {
  const name = brand?.platformName?.trim() || "TVMIX";
  const accent = brand?.accentColor || "#03A9F4";

  if (brand?.logoUrl) {
    return (
      <span
        aria-label={name}
        className={`inline-flex min-h-9 items-center ${className}`}
      >
        <img src={brand.logoUrl} alt={name} className="max-h-10 w-auto object-contain sm:max-h-12" />
      </span>
    );
  }

  const splitIndex = Math.max(1, Math.floor(name.length / 2));

  return (
    <span
      aria-label={name}
      className={`inline-flex items-center text-[1.45rem] font-black tracking-[-0.06em] sm:text-[1.8rem] ${className}`}
    >
      <span>{name.slice(0, splitIndex)}</span>
      <span style={{ color: accent }}>{name.slice(splitIndex)}</span>
    </span>
  );
}
