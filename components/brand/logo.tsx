import Image from "next/image";
import { cn } from "cn";

/**
 * Brand PostPilot terpusat — satu-satunya tempat path asset logo.
 * - horizontal: identitas brand (sidebar expanded, auth, landing)
 * - square: identitas simbol (sidebar collapsed, favicon, app icon)
 * Asset ditampilkan apa adanya: tanpa filter, glow, atau transform.
 */

export const BRAND_ASSETS = {
  horizontal: { src: "/brand/logo-horizontal.png", width: 974, height: 388 },
  square: { src: "/brand/logo-square.png", width: 391, height: 388 },
} as const;

export function BrandLogo({
  variant,
  className,
  priority = false,
}: {
  variant: "horizontal" | "square";
  className?: string;
  priority?: boolean;
}) {
  const asset = BRAND_ASSETS[variant];
  return (
    <Image
      src={asset.src}
      alt="PostPilot"
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={cn("w-auto object-contain", className)}
    />
  );
}
