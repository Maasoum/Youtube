import type { RevenuePoint } from "@/api";
import { formatNumber, formatToman } from "@/lib/format";

interface RevenueChartProps {
  data: RevenuePoint[];
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 22, bottom: 34, start: 18, end: 18 };

export function RevenueChart({ data }: RevenueChartProps) {
  const usableWidth = WIDTH - PADDING.start - PADDING.end;
  const usableHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const max = Math.max(...data.map((point) => point.amountToman), 1);
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = PADDING.start + index * stepX;
    const y =
      PADDING.top + usableHeight - (point.amountToman / max) * usableHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${PADDING.top + usableHeight} L${points[0].x},${PADDING.top + usableHeight} Z`
      : "";
  const total = data.reduce((sum, point) => sum + point.amountToman, 0);
  const hasRevenue = total > 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] text-muted">درآمد ۷ روز گذشته</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">
            {formatToman(total)}
          </p>
        </div>
        <p className="text-[10px] text-muted">
          بیشترین روز: {formatToman(max === 1 && !hasRevenue ? 0 : max)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="نمودار ستونی‌خطی درآمد هفت روز گذشته"
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6446E0" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#6446E0" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = PADDING.top + usableHeight * ratio;
          return (
            <line
              key={ratio}
              x1={PADDING.start}
              x2={WIDTH - PADDING.end}
              y1={y}
              y2={y}
              stroke={ratio === 1 ? "#D9D7E4" : "#ECEAF3"}
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : "4 6"}
            />
          );
        })}

        {hasRevenue ? (
          <>
            <path d={areaPath} fill="url(#revenue-fill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#6446E0"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <line
            x1={PADDING.start}
            x2={WIDTH - PADDING.end}
            y1={PADDING.top + usableHeight - 2}
            y2={PADDING.top + usableHeight - 2}
            stroke="#CFC5F8"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        )}

        {points.map((point) => (
          <g key={point.date}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill="#FFFFFF"
              stroke="#6446E0"
              strokeWidth="2"
            >
              <title>
                {`${point.label} — ${formatToman(point.amountToman)} — ${formatNumber(point.orders)} سفارش`}
              </title>
            </circle>
            {point.amountToman > 0 ? (
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="9"
                fill="#6B6B7B"
              >
                {formatNumber(Math.round(point.amountToman / 1000))} هزار
              </text>
            ) : null}
            <text
              x={point.x}
              y={HEIGHT - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#6B6B7B"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <ul className="sr-only">
        {data.map((point) => (
          <li key={`sr-${point.date}`}>
            {point.label}: {formatToman(point.amountToman)}،{" "}
            {formatNumber(point.orders)} سفارش
          </li>
        ))}
      </ul>
    </div>
  );
}
