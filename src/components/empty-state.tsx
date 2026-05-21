import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, ctaLabel, ctaTo, onCtaClick, children }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm"
    >
      <div className="text-6xl leading-none" aria-hidden>{icon}</div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaLabel && (ctaTo || onCtaClick) && (
        <div className="mt-2">
          {ctaTo ? (
            <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onCtaClick} className="bg-emerald-500 text-white hover:bg-emerald-600">
              {ctaLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
}