import { useId } from "react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

const starPoints = Array.from({ length: 24 }, (_, index) => {
  const radius = index % 2 === 0 ? 50 : 34;
  const angle = (Math.PI * index) / 12 - Math.PI / 2;
  return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(
    50 +
    radius * Math.sin(angle)
  ).toFixed(2)}`;
}).join(" ");

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none h-2.5 w-full", className)}
    >
      <path
        d="M2 8.2C13.5 2.8 22 10.3 33.5 6.2 45 2.1 53.5 10.2 65 6.2 76.5 2.2 85 10.3 96.5 6.2c6-2.1 12.7-1.2 21.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarBurst({
  className,
  filled = true,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <polygon
        points={starPoints}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 3}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M16 1.5c1.2 8.7 5.8 13.3 14.5 14.5C21.8 17.2 17.2 21.8 16 30.5 14.8 21.8 10.2 17.2 1.5 16 10.2 14.8 14.8 10.2 16 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ConcentricCircles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="160" cy="160" r="158" />
        <circle cx="160" cy="160" r="120" strokeDasharray="2 9" />
        <circle cx="160" cy="160" r="82" />
        <circle cx="160" cy="160" r="46" strokeDasharray="2 9" />
      </g>
    </svg>
  );
}

export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("dot-grid pointer-events-none", className)}
    />
  );
}

export function BrushBlob({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 180"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M29.8 77.9C42 36.7 82.3 12 128.7 17.4c44.8 5.2 82.7 34.5 78.8 68.2-3.8 33.3-47.6 44.7-85.4 58.7-39.9 14.8-82.8 27.7-99.8 1.6C7.3 120.6 17.8 118.6 29.8 77.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HandArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 90"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M112 8C98 46 71 68 27 69"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <path
        d="M41 54 23 69l20 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DotsTrail({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <g fill="currentColor">
        <circle cx="8" cy="52" r="3" />
        <circle cx="26" cy="43" r="3" />
        <circle cx="44" cy="34" r="3" />
        <circle cx="62" cy="25" r="3" />
        <circle cx="80" cy="16" r="3" />
        <circle cx="97" cy="7" r="3" />
      </g>
    </svg>
  );
}

/** لکه‌ی قلم‌مو با لبه‌های نامنظم؛ فقط تزئین و غیرقابل‌تعامل است. */
export function BrushStroke({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 130"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M17 72c-8-18 10-34 35-42 20-6 43-7 63-12 26-6 49-14 70-7 22 8 39 27 35 44-4 18-26 20-48 26-17 5-32 13-51 18-23 6-46 13-65 8-20-6-33-17-39-35Z"
        fill="currentColor"
      />
      <path
        d="M36 82c28-9 52-10 79-16 21-5 40-12 61-13"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** ستاره‌ی دندانه‌دار با گوشه‌های نرم؛ نسخه‌ی تزئینی برند. */
export function ScallopStar({ className }: { className?: string }) {
  const points = Array.from({ length: 24 }, (_, index) => {
    const radius = index % 2 === 0 ? 48 : 36;
    const angle = (Math.PI * index) / 12 - Math.PI / 2;
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(
      50 +
      radius * Math.sin(angle)
    ).toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <polygon
        points={points}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** فلش فنری دست‌نویس؛ در RTL با scale-x آینه می‌شود. */
export function CurlyArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 120"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M136 20c-28-8-55-2-73 15-13 13-17 31-7 42 9 10 26 7 30-5 4-11-6-21-18-20-20 1-34 17-39 36-2 8-2 16 0 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M16 88 29 111l19-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface RotatingSealProps {
  className?: string;
  text?: string;
}

/** مهر چرخان با متن دور دایره (SVG textPath) و ستاره‌ی زرد در مرکز. */
export function RotatingSeal({ className, text }: RotatingSealProps) {
  const rawId = useId();
  const pathId = `seal-path-${rawId.replace(/:/g, "")}`;
  const sealText = text ?? `${brand.nameFa} • ${brand.nameEn} •`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex items-center justify-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 200 200"
        className="seal-spin h-full w-full"
        focusable="false"
      >
        <defs>
          <path
            id={pathId}
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
          />
        </defs>
        <circle cx="100" cy="100" r="98" fill="#FFFFFF" />
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 8"
          opacity="0.4"
        />
        <circle
          cx="100"
          cy="100"
          r="58"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.18"
        />
        <text
          className="fill-primary"
          style={{ fontFamily: "Peyda, Tahoma, system-ui, sans-serif" }}
          fontSize="13.5"
          fontWeight="700"
          letterSpacing="0.4"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {sealText}
          </textPath>
        </text>
        <path
          d="M100 70l7.2 14.6 16.1 2.3-11.7 11.3 2.8 16-14.4-7.6-14.4 7.6 2.8-16-11.7-11.3 16.1-2.3L100 70Z"
          fill="#F7C948"
          stroke="#111111"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="100" r="4.5" fill="#6446E0" />
      </svg>
    </div>
  );
}
