import { AnimatedCounter } from "./AnimatedCounter";

interface Props {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
}

export function RadialProgress({ value, size = 140, thickness = 10, label, sublabel }: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`rp-${size}-${Math.round(value)}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={thickness} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={thickness}
          strokeLinecap="round"
          className="fill-none"
          stroke={`url(#rp-${size}-${Math.round(value)})`}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter
          value={value}
          suffix="%"
          className="text-2xl font-semibold tracking-tight text-foreground"
        />
        {label ? <span className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span> : null}
        {sublabel ? <span className="text-[11px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </div>
  );
}
