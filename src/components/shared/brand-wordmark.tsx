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

/** Monochrome lockup — matches logo v3 (light on navy, no accent tie-in). */
const wordmarkStyle: CSSProperties = {
  color: "#f1f5f9",
};

export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block font-heading font-semibold tracking-tight",
        sizeClass[size],
        className,
      )}
      style={wordmarkStyle}
    >
      E-ARI
    </span>
  );
}
