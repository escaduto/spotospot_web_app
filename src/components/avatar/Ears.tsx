// Ears: face circle cx=60, cy=60, r=40
// Left ear attaches at x≈20, right at x≈100

interface EarsProps {
  type: string;
  skinTone?: string;
}

export default function Ears({ type, skinTone = "#F5D6C6" }: EarsProps) {
  const light = skinTone;
  const shadow = "#C09484";

  switch (type) {
    case "none":
      return null;

    case "round":
      return (
        <g>
          <ellipse
            cx="19"
            cy="60"
            rx="7"
            ry="9"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <ellipse
            cx="19"
            cy="60"
            rx="4"
            ry="5.5"
            fill={shadow}
            opacity="0.3"
          />
          <ellipse
            cx="101"
            cy="60"
            rx="7"
            ry="9"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <ellipse
            cx="101"
            cy="60"
            rx="4"
            ry="5.5"
            fill={shadow}
            opacity="0.3"
          />
        </g>
      );

    case "pointed":
      return (
        <g>
          <path
            d="M21,50 L11,44 L21,72 Q25,64 25,60 Z"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <path
            d="M99,50 L109,44 L99,72 Q95,64 95,60 Z"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
        </g>
      );

    case "floppy":
      return (
        <g>
          <ellipse
            cx="17"
            cy="72"
            rx="9"
            ry="14"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
            transform="rotate(12 17 72)"
          />
          <ellipse
            cx="103"
            cy="72"
            rx="9"
            ry="14"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
            transform="rotate(-12 103 72)"
          />
        </g>
      );

    case "catEars":
      return (
        <g>
          <polygon
            points="36,30 26,10 52,24"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <polygon points="37,28 30,14 50,24" fill="#FFB7C5" />
          <polygon
            points="84,30 94,10 68,24"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <polygon points="83,28 90,14 70,24" fill="#FFB7C5" />
        </g>
      );

    case "dogEars":
      return (
        <g>
          <path
            d="M22,42 Q6,50 8,74 Q14,80 24,72 Q24,60 22,42 Z"
            fill="#C4905A"
            stroke="#A07840"
            strokeWidth="1"
          />
          <path
            d="M98,42 Q114,50 112,74 Q106,80 96,72 Q96,60 98,42 Z"
            fill="#C4905A"
            stroke="#A07840"
            strokeWidth="1"
          />
        </g>
      );

    case "bunnyEars":
      return (
        <g>
          <ellipse
            cx="43"
            cy="15"
            rx="6.5"
            ry="20"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <ellipse cx="43" cy="15" rx="3.5" ry="16" fill="#FFB7C5" />
          <ellipse
            cx="77"
            cy="15"
            rx="6.5"
            ry="20"
            fill={light}
            stroke={shadow}
            strokeWidth="1"
          />
          <ellipse cx="77" cy="15" rx="3.5" ry="16" fill="#FFB7C5" />
        </g>
      );

    case "bearEars":
      return (
        <g>
          <circle cx="36" cy="26" r="13" fill="#C4905A" />
          <circle cx="36" cy="26" r="8" fill="#9A6838" />
          <circle cx="84" cy="26" r="13" fill="#C4905A" />
          <circle cx="84" cy="26" r="8" fill="#9A6838" />
        </g>
      );

    case "foxEars":
      return (
        <g>
          <polygon
            points="36,32 26,8 54,24"
            fill="#E87828"
            stroke="#CC6018"
            strokeWidth="1"
          />
          <polygon points="37,30 32,13 51,24" fill={light} />
          <polygon
            points="84,32 94,8 66,24"
            fill="#E87828"
            stroke="#CC6018"
            strokeWidth="1"
          />
          <polygon points="83,30 88,13 69,24" fill={light} />
        </g>
      );

    case "mouseEars":
      return (
        <g>
          <circle
            cx="37"
            cy="23"
            r="17"
            fill="#E8C8D8"
            stroke="#D0A8C0"
            strokeWidth="1"
          />
          <circle cx="37" cy="23" r="11" fill="#F0D4E4" />
          <circle
            cx="83"
            cy="23"
            r="17"
            fill="#E8C8D8"
            stroke="#D0A8C0"
            strokeWidth="1"
          />
          <circle cx="83" cy="23" r="11" fill="#F0D4E4" />
        </g>
      );

    default:
      return null;
  }
}
