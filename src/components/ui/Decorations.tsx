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
