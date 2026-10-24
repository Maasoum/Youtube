import { formatNumber } from "@/lib/format";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface StatusDonutProps {
  slices: DonutSlice[];
  totalLabel: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StatusDonut({ slices, totalLabel }: StatusDonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="#F1EFF8"
            strokeWidth="13"
          />
          {total > 0
            ? slices
                .filter((slice) => slice.value > 0)
                .map((slice) => {
                  const length = (slice.value / total) * CIRCUMFERENCE;
                  const dashOffset = -offset;
                  offset += length;
                  return (
                    <circle
                      key={slice.label}
                      cx="50"
                      cy="50"
                      r={RADIUS}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="13"
                      strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="butt"
                    >
                      <title>
                        {slice.label}: {formatNumber(slice.value)}
                      </title>
                    </circle>
                  );
                })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums text-ink">
            {formatNumber(total)}
          </span>
          <span className="mt-0.5 text-[10px] text-muted">{totalLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {slices.map((slice) => (
          <li
            key={slice.label}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="flex items-center gap-2 text-muted">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              {slice.label}
            </span>
            <span className="font-bold tabular-nums text-ink">
              {formatNumber(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
