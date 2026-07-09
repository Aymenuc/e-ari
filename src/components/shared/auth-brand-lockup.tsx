import Link from "next/link";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { cn } from "@/lib/utils";

/** Logo + gradient wordmark — matches `Navigation` so auth flows align with marketing shell. */
export function AuthBrandLockup({
  className,
  variant = "default",
  wordmarkSize = "md",
}: {
  className?: string;
  variant?: "default" | "compact";
  wordmarkSize?: "sm" | "md" | "lg";
}) {
  const logo =
    variant === "compact"
      ? "h-9 w-9 rounded-lg transition-transform duration-200 group-hover:scale-105"
      : "h-12 w-12 rounded-xl transition-opacity duration-200 group-hover:opacity-95";

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 group", className)}>
      <img src="/logo.svg" alt="" className={logo} />
      <BrandWordmark size={wordmarkSize} />
    </Link>
  );
}
