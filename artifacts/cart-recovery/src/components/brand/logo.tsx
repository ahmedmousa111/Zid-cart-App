import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-9 w-9 shrink-0", className)}
      role="img"
      aria-label="عائد"
    >
      <defs>
        <linearGradient id="aid-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F1D58A" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="aid-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      {/* Deep-black tile with a faint gold edge */}
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.5"
        fill="#070808"
        stroke="url(#aid-gold)"
        strokeWidth="1"
        strokeOpacity="0.55"
      />
      {/* Return arc — arrowhead on the LEFT to evoke 'coming back' */}
      <path
        d="M30 14.5 C 26.5 9, 13.5 9, 10 14.5"
        fill="none"
        stroke="url(#aid-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 14.5 L 13 12 M 10 14.5 L 13 17"
        fill="none"
        stroke="url(#aid-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stylised ع */}
      <text
        x="20"
        y="32"
        textAnchor="middle"
        fontFamily="'Cairo','Tajawal',sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="url(#aid-emerald)"
      >
        ع
      </text>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <span className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
        عائد
      </span>
    </div>
  );
}
