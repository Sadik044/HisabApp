import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-[#00C48C] text-white shadow-sm",
        className ?? "h-9 w-9",
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[55%] w-[55%]"
      >
        {/* Wallet body */}
        <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        {/* Wallet flap */}
        <path d="M3 9.5h13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3" stroke="currentColor" strokeWidth="1.6" />
        {/* 3 split lines representing the 6-jar split */}
        <line x1="6.5" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="6.5" y1="12.5" x2="13" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="6.5" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
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