import { cn } from "@/lib/cn";

const SPOKES = [
  { angle: -25.74, delay: "0s" },
  { angle: 52.21, delay: "-1.95s", accent: true },
  { angle: 127.79, delay: "-1.3s" },
  { angle: 205.74, delay: "-0.65s" },
];

const LINK_LENGTH = 51.7;
const NODE_RADIUS = 62;

export function AnimatedIsotipo({ size = 128 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 200 200">
      <g transform="translate(100,100)" strokeLinecap="round">
        <circle
          r="63"
          fill="none"
          stroke="#e8eefc"
          strokeWidth="1.5"
          strokeDasharray="2 7"
          opacity="0.25"
        />

        {SPOKES.map(({ angle, delay, accent }) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <line
              className="icc-spoke-link"
              x1="0"
              y1="0"
              x2={LINK_LENGTH}
              y2="0"
              pathLength="100"
              stroke={accent ? "var(--brand)" : "#3b4a6b"}
              strokeWidth={accent ? 4.5 : 4}
              style={{ animationDelay: delay }}
            />
            <g className="icc-spoke-node" style={{ animationDelay: delay }}>
              {accent ? (
                <>
                  <circle
                    className="icc-ping"
                    cx={NODE_RADIUS}
                    cy="0"
                    r="19"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="2.5"
                    opacity="0.45"
                    style={{ animationDelay: delay }}
                  />
                  <circle cx={NODE_RADIUS} cy="0" r="12" fill="var(--brand)" />
                </>
              ) : (
                <circle
                  cx={NODE_RADIUS}
                  cy="0"
                  r="11"
                  fill="var(--background)"
                  stroke="#e8eefc"
                  strokeWidth="4"
                />
              )}
            </g>
          </g>
        ))}

        <circle r="24" fill="#e8eefc" />
        <path
          d="M-8,2 L0,-7 L8,2 M0,-7 L0,11"
          stroke="#0b1220"
          strokeWidth="4"
          fill="none"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function LoadingScreen({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground",
        className,
      )}
    >
      <AnimatedIsotipo />
      <span className="sr-only">{label}</span>
    </div>
  );
}
