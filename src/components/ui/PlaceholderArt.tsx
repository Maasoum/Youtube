import { useId } from "react";
import { brandColors } from "@/config/brand";
import { imageAlts } from "@/config/images";
import type { ImageKey } from "@/types/image";
import { cn } from "@/lib/cn";

interface PlaceholderArtProps {
  imageKey: ImageKey;
  className?: string;
}

interface Palette {
  start: string;
  end: string;
  glow: string;
}

const palettes: Record<ImageKey, Palette> = {
  hero: { start: "#E9E4FF", end: "#C9BDF7", glow: "#F7C948" },
  foundations: { start: "#F1EDFF", end: "#D9CFF9", glow: "#F7C948" },
  creative: { start: "#FFF0EA", end: "#FFD5CB", glow: "#6446E0" },
  python: { start: "#EAF2FF", end: "#CFE1FF", glow: "#F7C948" },
  safety: { start: "#E9F8FF", end: "#CDEEFF", glow: "#F7C948" },
  about: { start: "#F4F3F9", end: "#E1DAF8", glow: "#FF7A6B" },
  auth: { start: "#F0EBFF", end: "#D6CBF8", glow: "#F7C948" },
  success: { start: "#FFF8E2", end: "#FBE8A8", glow: "#6446E0" },
  notFound: { start: "#F4F3F9", end: "#E3DCF8", glow: "#7CC4FF" },
  dashboard: { start: "#EEE9FF", end: "#D9D0F8", glow: "#F7C948" },
};

const starPoints = Array.from({ length: 16 }, (_, index) => {
  const radius = index % 2 === 0 ? 50 : 28;
  const angle = (Math.PI * index) / 8 - Math.PI / 2;
  return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(
    50 +
    radius * Math.sin(angle)
  ).toFixed(2)}`;
}).join(" ");

function StarShape({
  x,
  y,
  size,
  color = brandColors.yellow,
  rotate = 0,
  opacity = 1,
}: {
  x: number;
  y: number;
  size: number;
  color?: string;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <polygon
      points={starPoints}
      fill={color}
      opacity={opacity}
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size / 100}) translate(-50 -50)`}
    />
  );
}

function SparkShape({
  x,
  y,
  size,
  color = "#FFFFFF",
  opacity = 0.8,
}: {
  x: number;
  y: number;
  size: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <path
      d="M0 -18C1.5 -6 6 -1.5 18 0 6 1.5 1.5 6 0 18-1.5 6-6 1.5-18 0-6-1.5-1.5-6 0-18Z"
      fill={color}
      opacity={opacity}
      transform={`translate(${x} ${y}) scale(${size / 36})`}
    />
  );
}

function BaseBackdrop({
  uid,
  palette,
}: {
  uid: string;
  palette: Palette;
}) {
  return (
    <>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.start} />
          <stop offset="100%" stopColor={palette.end} />
        </linearGradient>
        <pattern
          id={`dots-${uid}`}
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.6" fill="#111111" opacity="0.14" />
        </pattern>
      </defs>
      <rect width="640" height="480" fill={`url(#bg-${uid})`} />
      <rect width="640" height="480" fill={`url(#dots-${uid})`} opacity="0.6" />
      <circle cx="545" cy="74" r="132" fill="#FFFFFF" opacity="0.3" />
      <circle cx="82" cy="434" r="96" fill={palette.glow} opacity="0.22" />
      <circle
        cx="555"
        cy="352"
        r="76"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        opacity="0.55"
      />
      <circle
        cx="555"
        cy="352"
        r="48"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="3 8"
        opacity="0.55"
      />
    </>
  );
}

function FriendlyRobot({
  x,
  y,
  scale = 1,
  mood = "happy",
  tone = brandColors.primary,
}: {
  x: number;
  y: number;
  scale?: number;
  mood?: "happy" | "curious";
  tone?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="164" rx="124" ry="17" fill="#111111" opacity="0.1" />
      <g transform="rotate(-2)">
        <line
          x1="0"
          y1="-138"
          x2="0"
          y2="-166"
          stroke="#111111"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="0"
          cy="-174"
          r="10"
          fill={brandColors.yellow}
          stroke="#111111"
          strokeWidth="3"
        />
        <circle
          cx="-108"
          cy="-50"
          r="16"
          fill={brandColors.coral}
          stroke="#111111"
          strokeWidth="3"
        />
        <circle
          cx="108"
          cy="-50"
          r="16"
          fill={brandColors.sky}
          stroke="#111111"
          strokeWidth="3"
        />
        <rect
          x="-94"
          y="-136"
          width="188"
          height="146"
          rx="46"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="3"
        />
        <rect
          x="-68"
          y="-108"
          width="136"
          height="96"
          rx="30"
          fill="#F4F3F9"
          stroke="#111111"
          strokeWidth="2"
        />
        {mood === "happy" ? (
          <>
            <circle cx="-32" cy="-68" r="8" fill="#111111" />
            <circle cx="32" cy="-68" r="8" fill="#111111" />
            <path
              d="M-21 -44Q0 -26 21 -44"
              fill="none"
              stroke="#111111"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="-53" cy="-45" r="7" fill={brandColors.coral} opacity="0.55" />
            <circle cx="53" cy="-45" r="7" fill={brandColors.coral} opacity="0.55" />
          </>
        ) : (
          <>
            <circle cx="-32" cy="-68" r="9" fill="#111111" />
            <circle cx="34" cy="-68" r="6" fill="#111111" />
            <circle cx="2" cy="-39" r="7" fill="none" stroke="#111111" strokeWidth="3.5" />
          </>
        )}
        <path
          d="M-62 12 62 12"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.25"
        />
        <rect
          x="-64"
          y="16"
          width="128"
          height="108"
          rx="38"
          fill={tone}
          stroke="#111111"
          strokeWidth="3"
        />
        <rect x="-38" y="41" width="76" height="48" rx="18" fill="#FFFFFF" />
        <path
          d="M0 51.5l5.2 10.6 11.7 1.7-8.4 8.2 2 11.7L0 78.2l-10.5 5.5 2-11.7-8.4-8.2 11.7-1.7L0 51.5Z"
          fill={brandColors.yellow}
        />
        <path
          d="M-64 48C-92 51-108 68-116 96"
          fill="none"
          stroke="#111111"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M64 48C92 51 108 68 116 96"
          fill="none"
          stroke="#111111"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx="-118" cy="100" r="10" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <circle cx="118" cy="100" r="10" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <rect x="-44" y="122" width="28" height="30" rx="12" fill="#111111" />
        <rect x="16" y="122" width="28" height="30" rx="12" fill="#111111" />
      </g>
    </g>
  );
}

function FloatCube({
  x,
  y,
  size,
  color,
  rotate = 0,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  rotate?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity="0.95">
      <rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        rx={size * 0.26}
        fill={color}
        stroke="#111111"
        strokeWidth="2.5"
      />
    </g>
  );
}

function SceneHero() {
  return (
    <>
      <path
        d="M142 274c-14-84 34-154 118-174 96-23 217 13 246 100 25 77-38 148-129 177-90 28-221 8-235-103Z"
        fill="#FFFFFF"
        opacity="0.55"
      />
      <ellipse
        cx="320"
        cy="262"
        rx="238"
        ry="88"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeDasharray="4 10"
        opacity="0.9"
      />
      <StarShape x={112} y={140} size={64} rotate={12} />
      <StarShape x={514} y={286} size={42} color="#FFFFFF" rotate={-8} />
      <SparkShape x={480} y={118} size={36} color="#FFFFFF" />
      <SparkShape x={174} y={348} size={26} color={brandColors.primary} opacity={0.35} />
      <FloatCube x={138} y={262} size={54} color={brandColors.coral} rotate={-12} />
      <FloatCube x={516} y={154} size={46} color={brandColors.sky} rotate={14} />
      <FriendlyRobot x={330} y={258} scale={1.02} />
      <g transform="translate(468 366)">
        <rect
          x="-68"
          y="-34"
          width="136"
          height="68"
          rx="18"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
          transform="rotate(-7)"
        />
        <circle cx="-38" cy="-3" r="15" fill={brandColors.yellow} />
        <path
          d="M-45 -3l6 6 10-11"
          fill="none"
          stroke="#111111"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-8 0)"
        />
        <rect x="-12" y="-16" width="58" height="7" rx="3.5" fill="#111111" opacity="0.75" transform="rotate(-7)" />
        <rect x="-16" y="0" width="42" height="6" rx="3" fill="#111111" opacity="0.25" transform="rotate(-7)" />
      </g>
      <g transform="translate(168 378)">
        <rect x="-54" y="-30" width="108" height="60" rx="16" fill="#FFFFFF" opacity="0.92" transform="rotate(6)" />
        <circle cx="-24" cy="0" r="12" fill={brandColors.primary} opacity="0.85" />
        <rect x="0" y="-12" width="36" height="6" rx="3" fill="#111111" opacity="0.35" transform="rotate(6)" />
        <rect x="-2" y="2" width="26" height="5" rx="2.5" fill="#111111" opacity="0.2" transform="rotate(6)" />
      </g>
    </>
  );
}

function SceneFoundations() {
  return (
    <>
      <path
        d="M412 340c26-64 14-124-40-158"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeDasharray="2 12"
        strokeLinecap="round"
      />
      <StarShape x={425} y={138} size={68} rotate={10} />
      <SparkShape x={200} y={110} size={32} color="#FFFFFF" />
      <SparkShape x={480} y={262} size={20} color={brandColors.primary} opacity={0.4} />
      <g transform="translate(300 356)">
        <ellipse cx="0" cy="46" rx="176" ry="18" fill="#111111" opacity="0.08" />
        <rect x="-142" y="-24" width="118" height="82" rx="24" fill={brandColors.sky} stroke="#111111" strokeWidth="3" />
        <rect x="16" y="-24" width="118" height="82" rx="24" fill={brandColors.coral} stroke="#111111" strokeWidth="3" />
        <rect x="-64" y="-102" width="128" height="82" rx="24" fill={brandColors.primary} stroke="#111111" strokeWidth="3" />
        <circle cx="-13" cy="-61" r="13" fill="none" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M-20 28l12-22 12 22H-20Z" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" />
        <rect x="41" y="18" width="28" height="22" rx="6" fill="none" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M104 18h28v22h-28z" fill="none" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M130 18l-12-12" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform="translate(290 202)">
        <line x1="0" y1="-28" x2="0" y2="-48" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="-55" r="8" fill={brandColors.yellow} stroke="#111111" strokeWidth="2.5" />
        <rect x="-54" y="-30" width="108" height="76" rx="26" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <rect x="-36" y="-12" width="72" height="40" rx="15" fill="#F4F3F9" stroke="#111111" strokeWidth="2" />
        <circle cx="-16" cy="8" r="5" fill="#111111" />
        <circle cx="16" cy="8" r="5" fill="#111111" />
        <path d="M-8 20q8 7 16 0" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      </g>
      <FloatCube x={182} y={280} size={40} color={brandColors.yellow} rotate={-14} />
      <FloatCube x={496} y={372} size={48} color={brandColors.yellow} rotate={12} />
    </>
  );
}

function SceneCreative() {
  return (
    <>
      <path
        d="M94 358c58-36 92-84 156-88 72-4 98 52 172 38 62-12 88-52 120-84"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 13"
        opacity="0.9"
      />
      <g transform="translate(290 214)">
        <rect x="-168" y="-92" width="336" height="184" rx="44" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <path d="M-36 90l-28 40 62-38" fill="#FFFFFF" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
        <rect x="-132" y="-52" width="112" height="14" rx="7" fill={brandColors.primary} opacity="0.9" />
        <rect x="-132" y="-22" width="182" height="10" rx="5" fill="#111111" opacity="0.2" />
        <rect x="-132" y="4" width="146" height="10" rx="5" fill="#111111" opacity="0.2" />
        <rect x="-132" y="44" width="72" height="10" rx="5" fill={brandColors.coral} opacity="0.8" />
        <path d="M48 -46l9-18 9 18 18 9-18 9-9 18-9-18-18-9 18-9Z" fill={brandColors.yellow} />
        <circle cx="112" cy="28" r="26" fill={brandColors.sky} opacity="0.45" />
        <path d="M96 28h32M112 12v32" stroke={brandColors.primary} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>
      <g transform="translate(486 300) rotate(24)">
        <rect x="-12" y="-108" width="24" height="120" rx="12" fill={brandColors.yellow} stroke="#111111" strokeWidth="3" />
        <rect x="-20" y="10" width="40" height="34" rx="8" fill={brandColors.sky} stroke="#111111" strokeWidth="3" />
        <path d="M-20 44c-8 44 8 56 20 74 12-18 28-30 20-74Z" fill={brandColors.coral} stroke="#111111" strokeWidth="3" />
        <path d="M-8 44v74M8 44v56" stroke="#111111" strokeWidth="1.5" opacity="0.3" />
      </g>
      <g transform="translate(152 300)">
        <circle cx="0" cy="0" r="20" fill={brandColors.primary} />
        <rect x="-5" y="-58" width="10" height="44" rx="5" fill={brandColors.primary} />
        <path d="M5 -58c20-12 32-2 30 12-14-4-22-2-30 6Z" fill={brandColors.primary} />
      </g>
      <g transform="translate(504 128)">
        <circle cx="0" cy="0" r="18" fill={brandColors.yellow} stroke="#111111" strokeWidth="2.5" />
        <rect x="-4" y="-52" width="8" height="40" rx="4" fill={brandColors.yellow} stroke="#111111" strokeWidth="2.5" />
        <circle cx="22" cy="-40" r="12" fill={brandColors.coral} stroke="#111111" strokeWidth="2.5" />
      </g>
      <SparkShape x={120} y={150} size={34} color="#FFFFFF" />
      <StarShape x={545} y={390} size={38} color={brandColors.primary} opacity={0.45} rotate={12} />
    </>
  );
}

function ScenePython() {
  return (
    <>
      <g transform="translate(310 240)">
        <rect x="-207" y="-142" width="414" height="300" rx="32" fill="#111111" opacity="0.08" transform="translate(10 12)" />
        <rect x="-207" y="-142" width="414" height="300" rx="32" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <path d="M-207 -92h414" stroke="#111111" strokeWidth="2.5" opacity="0.15" />
        <circle cx="-178" cy="-116" r="7" fill={brandColors.coral} stroke="#111111" strokeWidth="2" />
        <circle cx="-152" cy="-116" r="7" fill={brandColors.yellow} stroke="#111111" strokeWidth="2" />
        <circle cx="-126" cy="-116" r="7" fill={brandColors.sky} stroke="#111111" strokeWidth="2" />
        <rect x="-175" y="-56" width="62" height="9" rx="4.5" fill={brandColors.primary} />
        <rect x="-99" y="-56" width="128" height="9" rx="4.5" fill="#111111" opacity="0.18" />
        <rect x="-143" y="-22" width="96" height="9" rx="4.5" fill={brandColors.coral} opacity="0.85" />
        <rect x="-33" y="-22" width="160" height="9" rx="4.5" fill="#111111" opacity="0.18" />
        <rect x="-167" y="12" width="42" height="9" rx="4.5" fill="#111111" opacity="0.18" />
        <rect x="-99" y="12" width="168" height="9" rx="4.5" fill={brandColors.sky} />
        <rect x="-117" y="46" width="86" height="9" rx="4.5" fill="#111111" opacity="0.18" />
        <rect x="-17" y="46" width="72" height="9" rx="4.5" fill={brandColors.yellow} />
        <rect x="-175" y="80" width="96" height="9" rx="4.5" fill="#111111" opacity="0.18" />
        <rect x="-61" y="80" width="132" height="9" rx="4.5" fill={brandColors.primary} opacity="0.55" />
        <g transform="translate(160 74)">
          <circle cx="0" cy="0" r="35" fill={brandColors.yellow} stroke="#111111" strokeWidth="3" />
          <circle cx="0" cy="0" r="12" fill="#FFFFFF" stroke="#111111" strokeWidth="2.5" />
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (Math.PI * index) / 4;
            return (
              <rect
                key={index}
                x={-4}
                y={-51}
                width="8"
                height="14"
                rx="4"
                fill={brandColors.yellow}
                stroke="#111111"
                strokeWidth="2"
                transform={`rotate(${(angle * 180) / Math.PI})`}
              />
            );
          })}
        </g>
      </g>
      <path d="M132 398c52-18 104-18 156 0s104 18 156 0 104-18 156 0" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
      <StarShape x={534} y={112} size={48} rotate={14} />
      <SparkShape x={102} y={126} size={36} color={brandColors.primary} opacity={0.35} />
      <g transform="translate(552 388)">
        <path d="M0 -42c30 16 30 58 0 78-30-20-30-62 0-78Z" fill={brandColors.coral} stroke="#111111" strokeWidth="2.5" />
        <circle cx="0" cy="-6" r="12" fill="#FFFFFF" stroke="#111111" strokeWidth="2.5" />
        <path d="M-18 26l-14 18M18 26l14 18" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      </g>
    </>
  );
}

function SceneSafety() {
  return (
    <>
      <circle
        cx="320"
        cy="248"
        r="178"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeDasharray="4 12"
        opacity="0.8"
      />
      <g transform="translate(320 252)">
        <path
          d="M-150-132 0-192l150 60v120c0 102-66 162-150 202-84-40-150-100-150-202Z"
          fill={brandColors.primary}
          stroke="#111111"
          strokeWidth="3"
        />
        <path
          d="M-126-112 0-162l126 50v104c0 82-55 132-126 166-71-34-126-84-126-166Z"
          fill={brandColors.primarySoft}
          opacity="0.55"
        />
        <path
          d="M-68 6 9 80l74-100"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="17"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform="translate(0 118)">
          <rect x="-32" y="-12" width="64" height="50" rx="12" fill={brandColors.yellow} stroke="#111111" strokeWidth="2.5" />
          <path d="M-19-12v-14a19 19 0 0 1 38 0v14" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="10" r="5" fill="#111111" />
        </g>
      </g>
      <StarShape x={120} y={130} size={58} rotate={-8} />
      <StarShape x={528} y={344} size={36} color="#FFFFFF" rotate={10} />
      <SparkShape x={512} y={112} size={30} color="#FFFFFF" />
      <SparkShape x={112} y={370} size={24} color={brandColors.primary} opacity={0.35} />
      <FloatCube x={530} y={226} size={42} color={brandColors.coral} rotate={12} />
    </>
  );
}

function SceneAbout() {
  return (
    <>
      <path
        d="M124 410c48-36 20-84 84-102 58-16 74-72 130-78 61-6 74 54 126 38 38-12 46-58 58-96"
        fill="none"
        stroke={brandColors.primary}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="3 16"
        opacity="0.55"
      />
      <circle cx="124" cy="410" r="13" fill={brandColors.coral} stroke="#FFFFFF" strokeWidth="4" />
      <circle cx="338" cy="230" r="13" fill={brandColors.yellow} stroke="#FFFFFF" strokeWidth="4" />
      <circle cx="522" cy="172" r="13" fill={brandColors.sky} stroke="#FFFFFF" strokeWidth="4" />
      <g transform="translate(520 98)">
        <line x1="0" y1="42" x2="0" y2="76" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
        <path d="M0 44c-38-4-52-34-40-56l30 10c-8 16 0 30 10 34Z" fill={brandColors.coral} stroke="#111111" strokeWidth="2.5" />
        <path d="M0 44c38-4 52-34 40-56L10-2c8 16 0 30-10 34Z" fill={brandColors.primary} stroke="#111111" strokeWidth="2.5" />
      </g>
      <StarShape x={126} y={120} size={72} rotate={12} />
      <g transform="translate(320 312)">
        <circle cx="-42" cy="0" r="46" fill={brandColors.primary} opacity="0.9" />
        <circle cx="42" cy="0" r="46" fill={brandColors.sky} opacity="0.9" />
        <circle cx="0" cy="-34" r="42" fill={brandColors.yellow} opacity="0.95" />
        <circle cx="0" cy="-6" r="12" fill="#FFFFFF" opacity="0.9" />
      </g>
      <SparkShape x={482} y={410} size={30} color={brandColors.coral} opacity={0.6} />
      <SparkShape x={196} y={300} size={26} color="#FFFFFF" />
    </>
  );
}

function SceneAuth() {
  return (
    <>
      <circle cx="320" cy="240" r="164" fill="#FFFFFF" opacity="0.28" />
      <circle cx="320" cy="240" r="128" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="4 10" opacity="0.8" />
      <circle cx="320" cy="240" r="92" fill="#FFFFFF" opacity="0.2" />
      <g transform="translate(330 236) rotate(-12)">
        <path d="M-158 18 148-64 62 94 24 36Z" fill="#FFFFFF" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-158 18 24 36 62 94" fill="none" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-52 46 62 94" stroke={brandColors.primary} strokeWidth="4" strokeLinecap="round" />
        <path d="M148-64 62 94" stroke={brandColors.primary} strokeWidth="4" strokeLinecap="round" opacity="0.4" />
        <circle cx="78" cy="16" r="12" fill={brandColors.coral} stroke="#111111" strokeWidth="2.5" />
      </g>
      <path
        d="M122 356c-44-56 20-104 72-82 46 20 18 74 78 70 62-4 54-68 112-54"
        fill="none"
        stroke={brandColors.primary}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 10"
        opacity="0.45"
      />
      <StarShape x={146} y={148} size={56} rotate={10} />
      <StarShape x={506} y={356} size={38} color={brandColors.primary} opacity={0.35} rotate={-12} />
      <SparkShape x={504} y={138} size={34} color="#FFFFFF" />
      <SparkShape x={164} y={388} size={26} color={brandColors.primary} opacity={0.35} />
      <g transform="translate(122 260)">
        <ellipse cx="0" cy="0" rx="40" ry="26" fill="#FFFFFF" />
        <circle cx="-18" cy="-4" r="12" fill="#FFFFFF" />
        <circle cx="16" cy="-8" r="16" fill="#FFFFFF" />
      </g>
    </>
  );
}

function SceneSuccess() {
  return (
    <>
      <circle cx="320" cy="250" r="156" fill="#FFFFFF" opacity="0.5" />
      <g transform="translate(318 268)">
        <rect x="-132" y="-16" width="264" height="154" rx="22" fill={brandColors.primary} stroke="#111111" strokeWidth="3" />
        <rect x="-148" y="-62" width="296" height="58" rx="18" fill={brandColors.yellow} stroke="#111111" strokeWidth="3" />
        <rect x="-22" y="-62" width="44" height="200" fill={brandColors.coral} stroke="#111111" strokeWidth="3" />
        <path d="M0 -62c-10-58-62-70-76-32-10 28 30 38 76 32Z" fill={brandColors.coral} stroke="#111111" strokeWidth="3" />
        <path d="M0 -62c10-58 62-70 76-32 10 28-30 38-76 32Z" fill={brandColors.coral} stroke="#111111" strokeWidth="3" />
        <g transform="translate(84 -104)">
          <circle cx="0" cy="0" r="34" fill={brandColors.primarySoft} stroke="#111111" strokeWidth="3" />
          <path d="M-15 2 -4 14 17-10" fill="none" stroke={brandColors.primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <StarShape x={130} y={130} size={64} rotate={-8} />
      <StarShape x={520} y={380} size={48} color={brandColors.primary} opacity={0.4} rotate={12} />
      <SparkShape x={504} y={118} size={34} color={brandColors.primary} opacity={0.5} />
      <SparkShape x={152} y={352} size={28} color={brandColors.coral} opacity={0.65} />
      <g fill={brandColors.coral}>
        <rect x="116" y="220" width="12" height="26" rx="6" transform="rotate(-22 122 233)" />
        <rect x="500" y="250" width="12" height="26" rx="6" transform="rotate(18 506 263)" />
      </g>
      <g fill={brandColors.primary}>
        <rect x="220" y="86" width="10" height="22" rx="5" transform="rotate(28 225 97)" />
        <rect x="420" y="104" width="10" height="22" rx="5" transform="rotate(-24 425 115)" />
      </g>
    </>
  );
}

function SceneNotFound() {
  return (
    <>
      <g transform="translate(506 142)">
        <circle cx="0" cy="0" r="58" fill={brandColors.yellow} stroke="#111111" strokeWidth="3" />
        <path d="M-18-16c0-20 34-24 36 0 2 16-18 14-18 30" fill="none" stroke="#111111" strokeWidth="7" strokeLinecap="round" />
        <circle cx="0" cy="34" r="5" fill="#111111" />
      </g>
      <FriendlyRobot x={300} y={260} scale={0.95} mood="curious" tone={brandColors.sky} />
      <g transform="translate(126 320)">
        <circle cx="0" cy="0" r="42" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <path d="M-12-8h24M0-20v24" stroke={brandColors.primary} strokeWidth="5" strokeLinecap="round" />
      </g>
      <path
        d="M116 410c58-24 112 24 180 4 58-18 96-68 158-50"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 12"
        opacity="0.9"
      />
      <SparkShape x={446} y={410} size={30} color="#FFFFFF" />
      <StarShape x={178} y={130} size={44} color={brandColors.primary} opacity={0.35} rotate={10} />
    </>
  );
}

function SceneDashboard() {
  return (
    <>
      <g transform="translate(320 250) rotate(-5)">
        <rect x="-196" y="-124" width="392" height="248" rx="28" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <path d="M-196-74h392" stroke="#111111" strokeWidth="2" opacity="0.15" />
        <circle cx="-164" cy="-99" r="7" fill={brandColors.coral} />
        <circle cx="-140" cy="-99" r="7" fill={brandColors.yellow} />
        <circle cx="-116" cy="-99" r="7" fill={brandColors.sky} />
        <rect x="-160" y="-44" width="92" height="12" rx="6" fill="#111111" opacity="0.18" />
        <rect x="-160" y="-18" width="210" height="18" rx="9" fill={brandColors.primary} opacity="0.85" />
        <rect x="-160" y="18" width="150" height="10" rx="5" fill="#111111" opacity="0.16" />
        <rect x="-160" y="42" width="112" height="10" rx="5" fill="#111111" opacity="0.16" />
        <rect x="-160" y="76" width="86" height="26" rx="13" fill={brandColors.yellow} />
        <g transform="translate(124 20)">
          <circle cx="0" cy="0" r="56" fill={brandColors.primarySoft} />
          <rect x="-24" y="-26" width="48" height="44" rx="10" fill="#FFFFFF" stroke="#111111" strokeWidth="2.5" />
          <path d="M-11-26v-12a11 11 0 0 1 22 0v12" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="-4" r="4" fill="#111111" />
          <path d="M0 0v8" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <g transform="translate(510 376) rotate(8)">
        <rect x="-84" y="-48" width="168" height="96" rx="20" fill={brandColors.yellow} stroke="#111111" strokeWidth="3" />
        <circle cx="-42" cy="0" r="20" fill="#FFFFFF" />
        <path d="M-51 0l7 7 12-14" fill="none" stroke={brandColors.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="-8" y="-16" width="64" height="9" rx="4.5" fill="#111111" opacity="0.55" />
        <rect x="-8" y="2" width="46" height="7" rx="3.5" fill="#111111" opacity="0.25" />
      </g>
      <StarShape x={122} y={130} size={58} rotate={-8} />
      <SparkShape x={498} y={124} size={34} color="#FFFFFF" />
      <SparkShape x={142} y={372} size={28} color={brandColors.primary} opacity={0.35} />
    </>
  );
}

const scenes: Record<ImageKey, () => JSX.Element> = {
  hero: SceneHero,
  foundations: SceneFoundations,
  creative: SceneCreative,
  python: ScenePython,
  safety: SceneSafety,
  about: SceneAbout,
  auth: SceneAuth,
  success: SceneSuccess,
  notFound: SceneNotFound,
  dashboard: SceneDashboard,
};

export function PlaceholderArt({ imageKey, className }: PlaceholderArtProps) {
  const uid = useId().replace(/:/g, "");
  const palette = palettes[imageKey];
  const Scene = scenes[imageKey];

  return (
    <div className={cn("relative overflow-hidden bg-surface-soft", className)}>
      <svg
        viewBox="0 0 640 480"
        role="img"
        aria-label={imageAlts[imageKey]}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>{imageAlts[imageKey]}</title>
        <BaseBackdrop uid={uid} palette={palette} />
        <Scene />
      </svg>
    </div>
  );
}
