import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

/** Same gradient as `.gradient-text-blue` / hero — lockup “E-ARI”. */
const wordmarkStyle: CSSProperties = {
  backgroundImage: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block font-heading font-semibold tracking-tight drop-shadow-[0_0_12px_rgba(37,99,235,0.35)]",
        sizeClass[size],
        className,
      )}
      style={wordmarkStyle}
    >
      E-ARI
    </span>
  );
}
