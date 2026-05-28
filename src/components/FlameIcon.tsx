"use client"

type FlameIconProps = {
  size?:   number
  streak?: number
}

function getFlameColors(streak: number) {
  if (streak >= 50) return {
    outerG: ["#c0e8ff", "#9040f8", "#e0102a"] as const,
    midG:   ["#ffffff", "#cc80ff", "#e81040"] as const,
    innerG: ["#ffffff", "#e0b8ff", "#c060ff"] as const,
    halo:   "#8040f8",
    glow:   "#c82040",
    baseGlowA: "rgba(200,32,64,0.78)", baseGlowB: "rgba(128,40,255,0.6)",
    embers: ["#c0e8ff", "#e060ff", "#ff4060", "#ffffff", "#d880ff", "#c0e8ff"] as const,
    dotA: "#e060ff", dotB: "#c0e8ff", dotC: "#ff4060",
  }
  if (streak >= 20) return {
    outerG: ["#ffe0e0", "#ff2828", "#c80020"] as const,
    midG:   ["#ffffff", "#ff9090", "#e01828"] as const,
    innerG: ["#ffffff", "#ffb8b8", "#ff6060"] as const,
    halo:   "#cc0018",
    glow:   "#cc0018",
    baseGlowA: "rgba(220,20,30,0.82)", baseGlowB: "rgba(180,0,20,0.5)",
    embers: ["#ffc8c8", "#ff6060", "#ff9090", "#ffffff", "#ffb8b8", "#ffc8c8"] as const,
    dotA: "#ff6060", dotB: "#ffc8c8", dotC: "#ff3030",
  }
  if (streak >= 10) return {
    outerG: ["#e8f8ff", "#38bfff", "#0070d0"] as const,
    midG:   ["#ffffff", "#88d4ff", "#1878f0"] as const,
    innerG: ["#ffffff", "#c8eeff", "#60c8ff"] as const,
    halo:   "#0068e8",
    glow:   "#0068e8",
    baseGlowA: "rgba(28,128,255,0.78)", baseGlowB: "rgba(0,80,200,0.5)",
    embers: ["#c8f0ff", "#60c8ff", "#98d8ff", "#ffffff", "#c8eeff", "#c8f0ff"] as const,
    dotA: "#60c8ff", dotB: "#c8f0ff", dotC: "#2080ff",
  }
  return {
    outerG: ["#ff8c1a", "#c96418", "#7a3208"] as const,
    midG:   ["#ffb84d", "#e8842a", "#b85220"] as const,
    innerG: ["#ffffff", "#fff4b0", "#ffd84d"] as const,
    halo:   "#ff7220",
    glow:   "#ff6010",
    baseGlowA: "rgba(255,125,18,0.78)", baseGlowB: "rgba(200,80,0,0.5)",
    embers: ["#fff4b0", "#e8842a", "#ffdb6b", "#ffffff", "#ffb347", "#fff4b0"] as const,
    dotA: "#ff9820", dotB: "#ffcc38", dotC: "#ff7818",
  }
}

export default function FlameIcon({ size = 120, streak = 0 }: FlameIconProps) {
  const h = Math.round(size * 1.12)
  const c = getFlameColors(streak)

  const outerPath = "M60 112 C35 100 25 78 33 56 C39 39 52 30 57 12 C75 31 92 45 90 68 C89 90 77 105 60 112 Z"
  const midPath   = "M60 106 C45 96 39 82 43 66 C47 52 58 43 60 28 C73 43 80 55 79 71 C78 88 70 100 60 106 Z"
  const innerPath = "M60 98 C52 91 50 81 53 72 C55 63 61 57 61 47 C70 58 73 67 72 78 C71 89 66 95 60 98 Z"
  const corePath  = "M60 93 C55 88 54 81 56 75 C58 68 62 64 62 56 C68 64 70 72 69 80 C68 88 64 91 60 93 Z"

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 134"
      width={size}
      height={h}
      style={{ display: "block", overflow: "visible", background: "transparent" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="fi-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="fi-core-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="fi-ember-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="fi-base-glow" cx="50%" cy="95%" r="52%">
          <stop offset="0%"   stopColor={c.baseGlowA} />
          <stop offset="60%"  stopColor={c.baseGlowB} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="fi-outer-grad" cx="50%" cy="82%" r="62%">
          <stop offset="0%"   stopColor={c.outerG[0]} />
          <stop offset="55%"  stopColor={c.outerG[1]} />
          <stop offset="100%" stopColor={c.outerG[2]} stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="fi-mid-grad" cx="50%" cy="76%" r="58%">
          <stop offset="0%"   stopColor={c.midG[0]} />
          <stop offset="50%"  stopColor={c.midG[1]} />
          <stop offset="100%" stopColor={c.midG[2]} />
        </radialGradient>
        <radialGradient id="fi-inner-grad" cx="50%" cy="68%" r="52%">
          <stop offset="0%"   stopColor={c.innerG[0]} />
          <stop offset="28%"  stopColor={c.innerG[1]} />
          <stop offset="100%" stopColor={c.innerG[2]} stopOpacity="0.82" />
        </radialGradient>
        <linearGradient id="fi-log-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8c5222" />
          <stop offset="100%" stopColor="#3c1e08" />
        </linearGradient>
        <linearGradient id="fi-log-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#744018" />
          <stop offset="100%" stopColor="#2e1606" />
        </linearGradient>
      </defs>

      <style>{`
        .fi-halo {
          animation: fiHaloPulse 2.2s ease-in-out infinite;
          transform-origin: 60px 108px;
        }
        @keyframes fiHaloPulse {
          0%, 100% { opacity: 0.3;  transform: scaleX(1)    scaleY(1); }
          50%       { opacity: 0.52; transform: scaleX(1.12) scaleY(1.06); }
        }
        .fi-glow {
          animation: fiGlowPulse 1.95s ease-in-out infinite;
          transform-origin: 60px 94px;
        }
        @keyframes fiGlowPulse {
          0%, 100% { opacity: 0.38; transform: scaleX(1.06) scaleY(0.97); }
          50%       { opacity: 0.6;  transform: scaleX(0.94) scaleY(1.05); }
        }
        .fi-outer {
          animation: fiOuterMorph 1.9s ease-in-out infinite;
          transform-origin: 60px 94px;
        }
        @keyframes fiOuterMorph {
          0%, 100% {
            d: path("M60 112 C35 100 25 78 33 56 C39 39 52 30 57 12 C75 31 92 45 90 68 C89 90 77 105 60 112 Z");
            transform: scaleX(1) translateY(0) rotate(0deg);
          }
          24% {
            d: path("M60 112 C31 99 22 73 33 52 C40 33 55 27 58 9 C77 30 96 46 93 71 C91 93 77 104 60 112 Z");
            transform: scaleX(0.94) translateY(1.2px) rotate(-1.8deg);
          }
          52% {
            d: path("M60 112 C37 101 26 77 35 57 C41 40 54 31 58 13 C74 32 90 48 88 70 C87 91 77 106 60 112 Z");
            transform: scaleX(1.05) translateY(-1.8px) rotate(1.2deg);
          }
          78% {
            d: path("M60 112 C33 100 24 75 33 54 C38 37 51 28 56 10 C77 32 94 45 92 70 C91 93 78 106 60 112 Z");
            transform: scaleX(0.97) translateY(0.6px) rotate(-0.6deg);
          }
        }
        .fi-mid {
          animation: fiMidMorph 1.38s ease-in-out -0.24s infinite;
          transform-origin: 60px 94px;
        }
        @keyframes fiMidMorph {
          0%, 100% {
            d: path("M60 106 C45 96 39 82 43 66 C47 52 58 43 60 28 C73 43 80 55 79 71 C78 88 70 100 60 106 Z");
            transform: translateX(0) scaleY(1);
          }
          33% {
            d: path("M60 106 C41 95 37 79 44 62 C49 47 61 40 65 25 C72 41 84 57 79 75 C77 92 70 101 60 106 Z");
            transform: translateX(1.8px) scaleY(0.96);
          }
          68% {
            d: path("M60 106 C47 97 40 82 43 68 C46 54 57 40 57 30 C76 44 80 59 82 74 C82 90 71 100 60 106 Z");
            transform: translateX(-1.8px) scaleY(1.04);
          }
        }
        .fi-inner {
          animation: fiInnerMorph 1.08s ease-in-out -0.5s infinite;
          transform-origin: 60px 92px;
        }
        @keyframes fiInnerMorph {
          0%, 100% {
            d: path("M60 98 C52 91 50 81 53 72 C55 63 61 57 61 47 C70 58 73 67 72 78 C71 89 66 95 60 98 Z");
            transform: translateY(0) scaleX(1);
          }
          38% {
            d: path("M60 98 C50 91 49 80 54 70 C57 60 64 56 65 44 C71 56 77 68 73 81 C71 91 66 95 60 98 Z");
            transform: translateY(1.8px) scaleX(0.88);
          }
          72% {
            d: path("M60 98 C53 92 48 82 51 73 C54 63 60 54 59 47 C73 61 73 70 75 80 C74 89 67 96 60 98 Z");
            transform: translateY(-1.8px) scaleX(1.1);
          }
        }
        .fi-core {
          animation: fiCorePulse 0.9s ease-in-out -0.14s infinite;
          transform-origin: 60px 88px;
        }
        @keyframes fiCorePulse {
          0%, 100% { opacity: 0.88; transform: scaleY(1)    scaleX(1); }
          50%       { opacity: 1;    transform: scaleY(1.08) scaleX(0.92); }
        }
        .fi-ember {
          opacity: 0;
          animation: fiEmberRise 2.5s ease-out infinite;
        }
        .fi-ea { animation-delay: -0.08s;  }
        .fi-eb { animation-delay: -0.74s;  }
        .fi-ec { animation-delay: -1.38s;  }
        .fi-ed { animation-delay: -0.42s;  }
        .fi-ee { animation-delay: -1.86s;  }
        .fi-ef { animation-delay: -1.08s;  }
        @keyframes fiEmberRise {
          0%   { opacity: 0;    transform: translateY(6px)  translateX(0px) scale(0.35); }
          10%  { opacity: 1; }
          75%  { opacity: 0.48; }
          100% { opacity: 0;    transform: translateY(-50px) translateX(var(--fi-ex, 0px)) scale(0.1); }
        }
        .fi-ember-dot {
          animation: fiEmberDot 1.1s ease-in-out infinite;
        }
        .fi-ed-a { animation-delay: 0s;    transform-origin: 46px 116px; }
        .fi-ed-b { animation-delay: 0.22s; transform-origin: 60px 118px; }
        .fi-ed-c { animation-delay: 0.44s; transform-origin: 74px 115px; }
        @keyframes fiEmberDot {
          0%, 100% { opacity: 0.65; r: 3;   }
          50%       { opacity: 1;    r: 4.2; }
        }
      `}</style>

      {/* Ground glow */}
      <ellipse cx="60" cy="128" rx="48" ry="12" fill="url(#fi-base-glow)" opacity="0.9" />

      {/* Log A */}
      <rect x="22" y="111" width="64" height="12" rx="6"
        fill="url(#fi-log-a)" transform="rotate(-25 54 117)" />
      {/* Log B */}
      <rect x="34" y="111" width="64" height="12" rx="6"
        fill="url(#fi-log-b)" transform="rotate(25 66 117)" />
      {/* Cross shadow */}
      <ellipse cx="60" cy="118" rx="18" ry="5" fill="rgba(0,0,0,0.32)" opacity="0.5" />

      {/* Live ember dots */}
      <circle className="fi-ember-dot fi-ed-a" cx="46" cy="116" r="3"   fill={c.dotA} filter="url(#fi-ember-glow)" />
      <circle className="fi-ember-dot fi-ed-b" cx="60" cy="118" r="3.5" fill={c.dotB} filter="url(#fi-ember-glow)" />
      <circle className="fi-ember-dot fi-ed-c" cx="74" cy="115" r="2.8" fill={c.dotC} filter="url(#fi-ember-glow)" />

      {/* Ambient halo */}
      <ellipse className="fi-halo" cx="60" cy="108" rx="26" ry="7"
        fill={c.halo} filter="url(#fi-soft-glow)" />

      {/* Blurred backing glow */}
      <path className="fi-glow" d={outerPath}
        fill={c.glow} filter="url(#fi-soft-glow)" opacity="0.52" />

      {/* Outer flame */}
      <path className="fi-outer" d={outerPath} fill="url(#fi-outer-grad)" />

      {/* Mid flame */}
      <path className="fi-mid" d={midPath} fill="url(#fi-mid-grad)" />

      {/* Inner flame */}
      <path className="fi-inner" d={innerPath} fill="url(#fi-inner-grad)" filter="url(#fi-core-glow)" />

      {/* White-hot core */}
      <path className="fi-core" d={corePath} fill="#ffffff" opacity="0.9" filter="url(#fi-core-glow)" />

      {/* Rising embers */}
      <circle className="fi-ember fi-ea" cx="45" cy="62" r="2.4" fill={c.embers[0]}
        style={{ "--fi-ex": "-10px" } as React.CSSProperties} />
      <circle className="fi-ember fi-eb" cx="75" cy="57" r="1.9" fill={c.embers[1]}
        style={{ "--fi-ex": "12px" } as React.CSSProperties} />
      <circle className="fi-ember fi-ec" cx="59" cy="46" r="2.6" fill={c.embers[2]}
        style={{ "--fi-ex": "-4px" } as React.CSSProperties} />
      <circle className="fi-ember fi-ed" cx="69" cy="54" r="1.6" fill={c.embers[3]}
        style={{ "--fi-ex": "7px" } as React.CSSProperties} />
      <circle className="fi-ember fi-ee" cx="50" cy="50" r="2.1" fill={c.embers[4]}
        style={{ "--fi-ex": "-14px" } as React.CSSProperties} />
      <circle className="fi-ember fi-ef" cx="64" cy="40" r="1.7" fill={c.embers[5]}
        style={{ "--fi-ex": "5px" } as React.CSSProperties} />
    </svg>
  )
}
