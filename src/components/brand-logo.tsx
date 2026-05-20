import { cn } from "@/lib/utils";
import brandLogoUrl from "@/assets/brand-logo.png";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center overflow-hidden rounded-xl bg-[#0a1330] shadow-sm",
        className ?? "h-9 w-9",
      )}
    >
      <img
        src={brandLogoUrl}
        alt="HisabApp logo"
        className="h-full w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

export function BrandLogo({
  className,
  iconClassName,
  textClassName,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={iconClassName} />
      <span className={cn("font-bold tracking-tight", textClassName)}>HisabApp</span>
    </span>
  );
}