import { useId } from "react";
import { imageAlts } from "@/config/images";
import { cn } from "@/lib/cn";

interface BoyArtProps {
  className?: string;
}

/** آواتار پسربچه روی دایره‌ی لوندر؛ تصویرسازی داخلی و بدون درخواست شبکه. */
export function BoyAvatar({ className }: BoyArtProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `boy-avatar-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label={imageAlts.boyAvatar}
      className={cn("h-full w-full", className)}
      focusable="false"
    >
      <title>{imageAlts.boyAvatar}</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="80" cy="80" r="78" />
        </clipPath>
      </defs>
      <circle cx="80" cy="80" r="78" fill="#CFC5F8" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="80" cy="80" r="78" fill="#CFC5F8" />
        <circle cx="134" cy="32" r="26" fill="#FFFFFF" opacity="0.35" />
        <g fill="#6446E0" opacity="0.2">
          {[18, 26, 34, 42].flatMap((y) =>
            [18, 26, 34, 42].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />
            )),
          )}
        </g>
        <path
          d="M80 38c16 0 27 11 27 27 0 15-9 27-27 27S53 80 53 65c0-16 11-27 27-27Z"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.4"
        />
        <path
          d="M52 65c0-20 12-33 28-33 17 0 28 12 28 32-5-4-8-10-9-16-9 8-25 11-38 9-2 4-5 7-9 8Z"
          fill="#4A2C22"
          stroke="#111111"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M54 61c-5-1-8 3-7 8 1 6 5 8 10 6"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.4"
        />
        <path
          d="M106 61c5-1 8 3 7 8-1 6-5 8-10 6"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.4"
        />
        <circle cx="70" cy="68" r="3.1" fill="#111111" />
        <circle cx="91" cy="68" r="3.1" fill="#111111" />
        <path
          d="M63 60c2-2 5-3 8-1M89 59c3-1 6 0 8 2"
          fill="none"
          stroke="#4A2C22"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="61" cy="82" r="5" fill="#F19A8C" opacity="0.6" />
        <circle cx="100" cy="82" r="5" fill="#F19A8C" opacity="0.6" />
        <path
          d="M72 87c5 6 13 6 18 0"
          fill="none"
          stroke="#111111"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M80 100v13"
          stroke="#E7AE8C"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M80 112c-24 0-38 12-42 30h84c-4-18-18-30-42-30Z"
          fill="#FF7A6B"
          stroke="#111111"
          strokeWidth="2.6"
        />
        <path
          d="M45 129c8-10 20-15 35-15s27 5 35 15"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          opacity="0.8"
        />
        <path
          d="M51 152c7-14 18-21 29-21s22 7 29 21"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          opacity="0.8"
        />
      </g>
      <circle
        cx="80"
        cy="80"
        r="76.5"
        fill="none"
        stroke="#111111"
        strokeWidth="2.5"
      />
      <path
        d="M132 26l2.6 6.2 6.4 1.2-4.8 4.4 1.2 6.4-5.4-3.2-5.4 3.2 1.2-6.4-4.8-4.4 6.4-1.2L132 26Z"
        fill="#F7C948"
        stroke="#111111"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** پسربچه‌ی راه‌راه قرمز روی کپسول لوندر؛ تصویر شاخص هیرو. */
export function BoyOnCapsule({ className }: BoyArtProps) {
  const uid = useId().replace(/:/g, "");
  const shirtClip = `boy-shirt-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 380 380"
      role="img"
      aria-label={imageAlts.boyCapsule}
      className={cn("h-full w-full", className)}
      focusable="false"
    >
      <title>{imageAlts.boyCapsule}</title>
      <defs>
        <clipPath id={shirtClip}>
          <path d="M148 208c16-7 26-10 42-10 17 0 31 4 45 11 12 6 18 16 16 29l-8 46H141l-7-45c-2-15 4-25 14-31Z" />
        </clipPath>
      </defs>

      <ellipse cx="190" cy="338" rx="138" ry="18" fill="#111111" opacity="0.08" />

      <g>
        <rect
          x="52"
          y="246"
          width="276"
          height="92"
          rx="46"
          fill="#CFC5F8"
          stroke="#111111"
          strokeWidth="3"
        />
        <rect
          x="68"
          y="260"
          width="244"
          height="64"
          rx="32"
          fill="none"
          stroke="#6446E0"
          strokeWidth="1.6"
          strokeDasharray="3 8"
          opacity="0.5"
        />
        <circle cx="88" cy="292" r="13" fill="#FFFFFF" opacity="0.55" />
        <circle cx="88" cy="292" r="6" fill="#6446E0" opacity="0.5" />
        <circle cx="300" cy="281" r="5" fill="#6446E0" opacity="0.45" />
        <circle cx="314" cy="298" r="3.5" fill="#6446E0" opacity="0.3" />
        <circle cx="228" cy="314" r="3" fill="#6446E0" opacity="0.28" />
      </g>

      <g>
        <path
          d="M162 250c-4 22-10 38-19 50"
          fill="none"
          stroke="#3F6DF6"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <path
          d="M218 250c6 22 12 37 20 49"
          fill="none"
          stroke="#3F6DF6"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <path
          d="M141 300c-3 10 1 17 12 18h18c5 0 7-6 3-9-8-5-13-10-15-17"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M237 299c5 10 2 17-9 19h-18c-5 0-7-6-3-9 8-5 12-10 15-16"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </g>

      <g>
        <path
          d="M148 208c16-7 26-10 42-10 17 0 31 4 45 11 12 6 18 16 16 29l-8 46H141l-7-45c-2-15 4-25 14-31Z"
          fill="#FF7A6B"
          stroke="#111111"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <g clipPath={`url(#${shirtClip})`}>
          <path
            d="M112 221h156v13H112zM110 247h160v13H110zM114 273h152v13H114z"
            fill="#FFFFFF"
            opacity="0.85"
          />
        </g>
        <path
          d="M190 198v20"
          stroke="#E7AE8C"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M156 210c-16 4-25 17-29 37-2 10 2 18 10 20 8 2 14-3 15-12l6-25"
          fill="#FF7A6B"
          stroke="#111111"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M225 210c15 5 22 16 25 31 2 10-2 17-10 18-8 1-13-4-14-13l-4-16"
          fill="#FF7A6B"
          stroke="#111111"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <circle
          cx="139"
          cy="267"
          r="10"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.4"
        />
        <g transform="rotate(12 260 190)">
          <path
            d="M250 225c0-20 7-36 12-48"
            fill="none"
            stroke="#F4C6A4"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <circle cx="263" cy="171" r="11" fill="#F4C6A4" stroke="#111111" strokeWidth="2.4" />
          <path d="M255 162c2-8 9-12 15-9" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
        </g>

        <path
          d="M190 92c23 0 39 16 39 39 0 22-14 39-39 39s-39-17-39-39c0-23 16-39 39-39Z"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.8"
        />
        <path
          d="M150 130c0-28 17-47 40-47 24 0 40 18 40 45-7-6-12-14-14-22-14 12-35 16-54 13-3 5-7 9-12 11Z"
          fill="#4A2C22"
          stroke="#111111"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M151 126c-7-1-11 4-10 11 1 8 7 11 14 8"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.6"
        />
        <path
          d="M229 126c7-1 11 4 10 11-1 8-7 11-14 8"
          fill="#F4C6A4"
          stroke="#111111"
          strokeWidth="2.6"
        />
        <circle cx="176" cy="135" r="3.8" fill="#111111" />
        <circle cx="204" cy="135" r="3.8" fill="#111111" />
        <path
          d="M166 124c3-3 7-4 11-2M199 122c4-1 8 0 11 3"
          fill="none"
          stroke="#4A2C22"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="163" cy="153" r="6" fill="#F19A8C" opacity="0.55" />
        <circle cx="217" cy="153" r="6" fill="#F19A8C" opacity="0.55" />
        <path
          d="M178 157c7 7 17 7 24 0"
          fill="none"
          stroke="#111111"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M318 76l4 9.4 10 1.8-7.4 6.8 1.8 10-8.4-5-8.4 5 1.8-10-7.4-6.8 10-1.8L318 76Z"
        fill="#F7C948"
        stroke="#111111"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M56 98c10-6 20-6 30 0M52 114c8-4 15-4 22 0"
        fill="none"
        stroke="#6446E0"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="68" cy="66" r="5" fill="#F7C948" />
      <circle cx="86" cy="54" r="3" fill="#FF7A6B" />
      <circle cx="318" cy="188" r="4" fill="#7CC4FF" />
    </svg>
  );
}
