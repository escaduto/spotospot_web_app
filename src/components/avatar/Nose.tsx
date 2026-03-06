// Nose position: center (60, 64)

export default function Nose({ type }: { type: string }) {
  switch (type) {
    case "none":
      return null;

    case "dot":
      return <circle cx="60" cy="64" r="2" fill="#C4A08A" />;

    case "small":
      return (
        <g>
          <circle cx="57" cy="64" r="1.8" fill="#C09080" />
          <circle cx="63" cy="64" r="1.8" fill="#C09080" />
        </g>
      );

    case "triangle":
      return <polygon points="60,59 56,67 64,67" fill="#C4A08A" />;

    case "button":
      return (
        <g>
          <circle cx="60" cy="64" r="4.5" fill="#C4A08A" />
          <circle cx="58" cy="63" r="1.5" fill="#A88070" opacity="0.7" />
          <circle cx="62" cy="63" r="1.5" fill="#A88070" opacity="0.7" />
        </g>
      );

    case "long":
      return (
        <g>
          <path
            d="M60,59 L60,67"
            stroke="#C4A08A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M55,67 Q60,65 65,67"
            fill="none"
            stroke="#C4A08A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "round":
      return (
        <g>
          <ellipse cx="60" cy="64" rx="5.5" ry="4" fill="#C4A08A" />
        </g>
      );

    case "catNose":
      return (
        <g>
          <polygon points="60,68 55,61 65,61" fill="#FFB7C5" />
          <path
            d="M60,68 L55,72 M60,68 L65,72"
            stroke="#FF88A8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      );

    case "dogNose":
      return (
        <g>
          <ellipse cx="60" cy="63" rx="7" ry="4.5" fill="#333" />
          <ellipse cx="57" cy="62" rx="2" ry="1.5" fill="#555" />
          <ellipse cx="63" cy="62" rx="2" ry="1.5" fill="#555" />
          <path
            d="M56,66 L60,70 L64,66"
            fill="none"
            stroke="#555"
            strokeWidth="1"
          />
        </g>
      );

    case "bunnyNose":
      return (
        <g>
          <ellipse cx="60" cy="61" rx="2.5" ry="2" fill="#FFB7C5" />
          <path
            d="M60,63 L57,67 M60,63 L63,67"
            stroke="#FFB7C5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "pigNose":
      return (
        <g>
          <ellipse cx="60" cy="64" rx="8" ry="5.5" fill="#F5A898" />
          <ellipse cx="57" cy="64" rx="2.5" ry="3" fill="#E88878" />
          <ellipse cx="63" cy="64" rx="2.5" ry="3" fill="#E88878" />
        </g>
      );

    default:
      return <circle cx="60" cy="64" r="2" fill="#C4A08A" />;
  }
}
