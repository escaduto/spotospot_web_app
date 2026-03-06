// Accessories are drawn on top of everything else (at the head level)

export default function Accessories({ type }: { type: string }) {
  switch (type) {
    case "none":
      return null;

    case "glasses":
      return (
        <g>
          <circle
            cx="45"
            cy="52"
            r="10"
            fill="none"
            stroke="#555"
            strokeWidth="2"
          />
          <circle
            cx="75"
            cy="52"
            r="10"
            fill="none"
            stroke="#555"
            strokeWidth="2"
          />
          <line x1="55" y1="52" x2="65" y2="52" stroke="#555" strokeWidth="2" />
          <line
            x1="35"
            y1="51"
            x2="22"
            y2="49"
            stroke="#555"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="85"
            y1="51"
            x2="98"
            y2="49"
            stroke="#555"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      );

    case "sunglasses":
      return (
        <g>
          <rect
            x="35"
            y="44"
            width="20"
            height="14"
            rx="7"
            fill="#1a1a1a"
            opacity="0.9"
          />
          <rect
            x="65"
            y="44"
            width="20"
            height="14"
            rx="7"
            fill="#1a1a1a"
            opacity="0.9"
          />
          <line
            x1="55"
            y1="51"
            x2="65"
            y2="51"
            stroke="#333"
            strokeWidth="2.5"
          />
          <line
            x1="35"
            y1="51"
            x2="22"
            y2="49"
            stroke="#333"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="85"
            y1="51"
            x2="98"
            y2="49"
            stroke="#333"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <rect
            x="36"
            y="45"
            width="18"
            height="6"
            rx="3"
            fill="#3a3a5c"
            opacity="0.5"
          />
          <rect
            x="66"
            y="45"
            width="18"
            height="6"
            rx="3"
            fill="#3a3a5c"
            opacity="0.5"
          />
        </g>
      );

    case "monocle":
      return (
        <g>
          <circle
            cx="75"
            cy="52"
            r="10"
            fill="none"
            stroke="#9B7D40"
            strokeWidth="2"
          />
          <line
            x1="85"
            y1="55"
            x2="93"
            y2="62"
            stroke="#9B7D40"
            strokeWidth="1.5"
          />
        </g>
      );

    case "hat":
      return (
        <g>
          <rect x="32" y="34" width="56" height="8" rx="3" fill="#1a1a1a" />
          <rect x="42" y="12" width="36" height="24" rx="2" fill="#1a1a1a" />
          <rect
            x="44"
            y="13"
            width="32"
            height="4"
            rx="1"
            fill="#333"
            opacity="0.5"
          />
        </g>
      );

    case "beanie":
      return (
        <g>
          {/* dome covering top of head — stops well above the eyes */}
          <path d="M22,46 Q22,18 60,16 Q98,18 98,46" fill="#7C5CBF" />
          {/* brim band */}
          <path
            d="M20,44 Q60,40 100,44"
            fill="none"
            stroke="#6A4AAA"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* pom-pom on top */}
          <circle cx="60" cy="16" r="5" fill="#9B7DE0" />
          <line
            x1="22"
            y1="44"
            x2="98"
            y2="44"
            stroke="#5E3CA0"
            strokeWidth="2"
            opacity="0.3"
          />
        </g>
      );

    case "crown":
      return (
        <g>
          {/* crown points raised well above eye level */}
          <path
            d="M30,36 L40,20 L53,30 L60,12 L67,30 L80,20 L90,36 Z"
            fill="#FFD700"
            stroke="#E5A500"
            strokeWidth="1"
          />
          {/* crown band base — bottom at y=42, safely above eyes at y=52 */}
          <rect
            x="30"
            y="34"
            width="60"
            height="9"
            rx="2"
            fill="#FFD700"
            stroke="#E5A500"
            strokeWidth="1"
          />
          <circle cx="60" cy="19" r="3" fill="#FF5858" />
          <circle cx="44" cy="27" r="2.5" fill="#5B8EFF" />
          <circle cx="76" cy="27" r="2.5" fill="#5B8EFF" />
        </g>
      );

    case "headband":
      return (
        <path
          d="M22,40 Q60,34 98,40"
          fill="none"
          stroke="#E87878"
          strokeWidth="9"
          strokeLinecap="round"
        />
      );

    case "bow":
      return (
        <g>
          <path d="M50,26 L40,16 L40,36 Z" fill="#FF6B9D" />
          <path d="M70,26 L80,16 L80,36 Z" fill="#FF6B9D" />
          <circle cx="60" cy="26" r="7" fill="#FF4D8F" />
          <ellipse cx="60" cy="26" rx="4" ry="3" fill="#FF7AB5" />
        </g>
      );

    case "flowerCrown":
      return (
        <g>
          <path
            d="M24,50 Q40,22 60,18 Q80,22 96,50"
            fill="none"
            stroke="#5DAA5D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {[
            { cx: 24, cy: 50, c: "#FF6B6B" },
            { cx: 34, cy: 32, c: "#FFB347" },
            { cx: 50, cy: 20, c: "#FF6B6B" },
            { cx: 70, cy: 20, c: "#FFE066" },
            { cx: 86, cy: 32, c: "#FF6B6B" },
            { cx: 96, cy: 50, c: "#FFB347" },
          ].map((f, i) => (
            <g key={i}>
              <circle cx={f.cx} cy={f.cy} r="6" fill={f.c} />
              <circle cx={f.cx} cy={f.cy} r="3" fill="white" />
              <circle cx={f.cx} cy={f.cy} r="1.5" fill="#FFD700" />
            </g>
          ))}
        </g>
      );

    default:
      return null;
  }
}
