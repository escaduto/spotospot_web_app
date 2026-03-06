// Blush cheeks: left (40,67), right (80,67)

export default function Blush({ type }: { type: string }) {
  switch (type) {
    case "none":
      return null;

    case "round":
      return (
        <g>
          <circle cx="40" cy="67" r="9" fill="#FFB7C5" opacity="0.45" />
          <circle cx="80" cy="67" r="9" fill="#FFB7C5" opacity="0.45" />
        </g>
      );

    case "oval":
      return (
        <g>
          <ellipse
            cx="40"
            cy="67"
            rx="12"
            ry="7"
            fill="#FFB7C5"
            opacity="0.45"
          />
          <ellipse
            cx="80"
            cy="67"
            rx="12"
            ry="7"
            fill="#FFB7C5"
            opacity="0.45"
          />
        </g>
      );

    case "sparkle":
      return (
        <g>
          {/* Left sparkle blush */}
          <circle cx="40" cy="67" r="7" fill="#FFB7C5" opacity="0.35" />
          <path
            d="M40,60 L41,67 L40,74 L39,67 Z"
            fill="#FFB7C5"
            opacity="0.6"
          />
          <path
            d="M33,67 L40,66 L47,67 L40,68 Z"
            fill="#FFB7C5"
            opacity="0.6"
          />
          <circle cx="36" cy="63" r="1" fill="#FF88AA" opacity="0.7" />
          <circle cx="44" cy="71" r="1" fill="#FF88AA" opacity="0.7" />
          {/* Right sparkle blush */}
          <circle cx="80" cy="67" r="7" fill="#FFB7C5" opacity="0.35" />
          <path
            d="M80,60 L81,67 L80,74 L79,67 Z"
            fill="#FFB7C5"
            opacity="0.6"
          />
          <path
            d="M73,67 L80,66 L87,67 L80,68 Z"
            fill="#FFB7C5"
            opacity="0.6"
          />
          <circle cx="76" cy="63" r="1" fill="#FF88AA" opacity="0.7" />
          <circle cx="84" cy="71" r="1" fill="#FF88AA" opacity="0.7" />
        </g>
      );

    case "star":
      return (
        <g>
          {/* Left star blush */}
          <path
            d="M40,60 L41.2,64.2 L45.5,64.2 L42.2,66.8 L43.4,71 L40,68.5 L36.6,71 L37.8,66.8 L34.5,64.2 L38.8,64.2 Z"
            fill="#FFB7C5"
            opacity="0.7"
          />
          {/* Right star blush */}
          <path
            d="M80,60 L81.2,64.2 L85.5,64.2 L82.2,66.8 L83.4,71 L80,68.5 L76.6,71 L77.8,66.8 L74.5,64.2 L78.8,64.2 Z"
            fill="#FFB7C5"
            opacity="0.7"
          />
        </g>
      );

    default:
      return null;
  }
}
