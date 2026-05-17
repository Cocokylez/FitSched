type FlameIconProps = {
  size?: number
}

export default function FlameIcon({ size = 120 }: FlameIconProps) {
  const outerPath = "M60 112 C35 100 25 78 33 56 C39 39 52 30 57 12 C75 31 92 45 90 68 C89 90 77 105 60 112 Z"
  const midPath = "M60 106 C45 96 39 82 43 66 C47 52 58 43 60 28 C73 43 80 55 79 71 C78 88 70 100 60 106 Z"
  const innerPath = "M60 98 C52 91 50 81 53 72 C55 63 61 57 61 47 C70 58 73 67 72 78 C71 89 66 95 60 98 Z"

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{
        display: "block",
        overflow: "visible",
        background: "transparent",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .flameIconOuter {
            animation: flameIconOuterMorph 1.85s ease-in-out infinite;
            transform-origin: 60px 94px;
          }

          .flameIconMid {
            animation: flameIconMidMorph 1.35s ease-in-out -0.22s infinite;
            transform-origin: 60px 94px;
          }

          .flameIconInner {
            animation: flameIconInnerMorph 1.05s ease-in-out -0.48s infinite;
            transform-origin: 60px 92px;
          }

          .flameIconEmber {
            opacity: 0;
            animation: flameIconEmberRise 2.25s ease-out infinite;
            transform-origin: center;
          }

          .flameIconEmberOne {
            animation-delay: -0.15s;
          }

          .flameIconEmberTwo {
            animation-delay: -0.82s;
          }

          .flameIconEmberThree {
            animation-delay: -1.42s;
          }

          @keyframes flameIconOuterMorph {
            0%, 100% {
              d: path("M60 112 C35 100 25 78 33 56 C39 39 52 30 57 12 C75 31 92 45 90 68 C89 90 77 105 60 112 Z");
              transform: scaleX(1) translateY(0);
            }
            38% {
              d: path("M60 112 C33 99 27 75 35 54 C42 35 54 31 60 10 C74 29 96 44 91 70 C88 92 76 104 60 112 Z");
              transform: scaleX(0.96) translateY(1px);
            }
            68% {
              d: path("M60 112 C37 101 24 79 32 58 C37 42 51 29 55 14 C78 34 89 48 88 69 C87 89 78 106 60 112 Z");
              transform: scaleX(1.03) translateY(-1px);
            }
          }

          @keyframes flameIconMidMorph {
            0%, 100% {
              d: path("M60 106 C45 96 39 82 43 66 C47 52 58 43 60 28 C73 43 80 55 79 71 C78 88 70 100 60 106 Z");
              transform: translateX(0) scaleY(1);
            }
            45% {
              d: path("M60 106 C43 96 40 80 45 64 C49 49 59 44 63 27 C71 43 82 56 78 73 C76 90 70 101 60 106 Z");
              transform: translateX(1px) scaleY(0.98);
            }
            74% {
              d: path("M60 106 C47 97 38 83 42 68 C46 54 57 42 58 30 C74 45 78 57 80 72 C80 88 71 100 60 106 Z");
              transform: translateX(-1px) scaleY(1.02);
            }
          }

          @keyframes flameIconInnerMorph {
            0%, 100% {
              d: path("M60 98 C52 91 50 81 53 72 C55 63 61 57 61 47 C70 58 73 67 72 78 C71 89 66 95 60 98 Z");
              transform: translateY(0) scaleX(1);
            }
            42% {
              d: path("M60 98 C51 91 51 80 54 71 C57 62 62 58 63 46 C69 57 75 68 72 80 C70 90 66 95 60 98 Z");
              transform: translateY(1px) scaleX(0.92);
            }
            70% {
              d: path("M60 98 C53 92 49 82 52 73 C54 64 60 56 60 48 C71 60 72 68 73 79 C73 88 67 96 60 98 Z");
              transform: translateY(-1px) scaleX(1.06);
            }
          }

          @keyframes flameIconEmberRise {
            0% {
              opacity: 0;
              transform: translateY(14px) scale(0.55);
            }
            16% {
              opacity: 0.9;
            }
            72% {
              opacity: 0.45;
            }
            100% {
              opacity: 0;
              transform: translateY(-34px) scale(1);
            }
          }
        `}
      </style>

      <circle className="flameIconEmber flameIconEmberOne" cx="43" cy="55" r="2.4" fill="#fff4b0" />
      <circle className="flameIconEmber flameIconEmberTwo" cx="77" cy="50" r="2" fill="#e8842a" />
      <circle className="flameIconEmber flameIconEmberThree" cx="62" cy="39" r="1.8" fill="#fff4b0" />

      <path className="flameIconOuter" d={outerPath} fill="#c9a84c" />
      <path className="flameIconMid" d={midPath} fill="#e8842a" />
      <path className="flameIconInner" d={innerPath} fill="#fff4b0" />
    </svg>
  )
}
