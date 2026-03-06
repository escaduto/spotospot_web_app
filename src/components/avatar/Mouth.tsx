// Mouth position: center (60, 73)

export default function Mouth({ type }: { type: string }) {
  switch (type) {
    case "none":
      return null;
    case "smile":
      return (
        <path
          d="M51,73 Q60,80 69,73"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "bigSmile":
      return (
        <path
          d="M47,73 Q60,83 73,73"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "openSmile":
      return (
        <g>
          <path
            d="M50,71 Q60,82 70,71"
            fill="#8B3A3A"
            stroke="#5A3030"
            strokeWidth="1.5"
          />
          <path d="M50,71 Q60,75.5 70,71" fill="white" />
        </g>
      );

    case "grin":
      return (
        <g>
          <path
            d="M46,70 Q60,84 74,70 Z"
            fill="#8B3A3A"
            stroke="#5A3030"
            strokeWidth="1.5"
          />
          <path d="M46,70 Q60,75.5 74,70" fill="white" />
        </g>
      );

    case "laugh":
      return (
        <g>
          <ellipse
            cx="60"
            cy="77"
            rx="12"
            ry="8"
            fill="#8B3A3A"
            stroke="#5A3030"
            strokeWidth="1.5"
          />
          <path d="M48,77 Q60,71 72,77" fill="white" />
        </g>
      );

    case "smirk":
      return (
        <path
          d="M54,74 Q63,79 70,74"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "neutral":
      return (
        <line
          x1="53"
          y1="73"
          x2="67"
          y2="73"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "flat":
      return (
        <line
          x1="50"
          y1="73"
          x2="70"
          y2="73"
          stroke="#5A3030"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );

    case "sad":
      return (
        <path
          d="M51,78 Q60,71 69,78"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "frown":
      return (
        <path
          d="M48,80 Q60,68 72,80"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );

    case "tongue":
      return (
        <g>
          <path
            d="M50,71 Q60,82 70,71"
            fill="#8B3A3A"
            stroke="#5A3030"
            strokeWidth="1.5"
          />
          <path d="M50,71 Q60,75.5 70,71" fill="white" />
          <ellipse cx="60" cy="79" rx="5.5" ry="4" fill="#FF85A1" />
          <line
            x1="60"
            y1="75.5"
            x2="60"
            y2="83"
            stroke="#FF5588"
            strokeWidth="0.8"
          />
        </g>
      );

    case "surprised":
      return (
        <ellipse
          cx="60"
          cy="76"
          rx="6"
          ry="7"
          fill="#8B3A3A"
          stroke="#5A3030"
          strokeWidth="1.5"
        />
      );

    default:
      return (
        <path
          d="M51,73 Q60,80 69,73"
          fill="none"
          stroke="#5A3030"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
  }
}
