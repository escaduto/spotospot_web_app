// Eye positions: left (45, 52), right (75, 52)

export default function Eyes({ type }: { type: string }) {
  switch (type) {
    case "round":
      return (
        <g>
          <circle cx="45" cy="52" r="5" fill="#333" />
          <circle cx="46.5" cy="50.5" r="1.5" fill="white" />
          <circle cx="75" cy="52" r="5" fill="#333" />
          <circle cx="76.5" cy="50.5" r="1.5" fill="white" />
        </g>
      );

    case "small":
      return (
        <g>
          <circle cx="45" cy="52" r="3" fill="#333" />
          <circle cx="75" cy="52" r="3" fill="#333" />
        </g>
      );

    case "sleepy":
      return (
        <g>
          <circle cx="45" cy="53" r="5" fill="#333" />
          <path d="M40,53 Q45,49 50,53" fill="#F5D6C6" stroke="none" />
          <path
            d="M40,52 Q45,48.5 50,52"
            fill="none"
            stroke="#C09484"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="75" cy="53" r="5" fill="#333" />
          <path d="M70,53 Q75,49 80,53" fill="#F5D6C6" stroke="none" />
          <path
            d="M70,52 Q75,48.5 80,52"
            fill="none"
            stroke="#C09484"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "smile":
      return (
        <g>
          <path
            d="M40,54 Q45,49 50,54"
            fill="none"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M70,54 Q75,49 80,54"
            fill="none"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "wink":
      return (
        <g>
          <circle cx="45" cy="52" r="5" fill="#333" />
          <circle cx="46.5" cy="50.5" r="1.5" fill="white" />
          <path
            d="M70,52 Q75,49 80,52"
            fill="none"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "wide":
      return (
        <g>
          <circle
            cx="45"
            cy="52"
            r="7"
            fill="white"
            stroke="#333"
            strokeWidth="1.5"
          />
          <circle cx="45" cy="52" r="4" fill="#333" />
          <circle cx="43" cy="50" r="1.5" fill="white" />
          <circle
            cx="75"
            cy="52"
            r="7"
            fill="white"
            stroke="#333"
            strokeWidth="1.5"
          />
          <circle cx="75" cy="52" r="4" fill="#333" />
          <circle cx="73" cy="50" r="1.5" fill="white" />
        </g>
      );

    case "dot":
      return (
        <g>
          <circle cx="45" cy="52" r="2" fill="#333" />
          <circle cx="75" cy="52" r="2" fill="#333" />
        </g>
      );

    case "oval":
      return (
        <g>
          <ellipse cx="45" cy="52" rx="3" ry="5" fill="#333" />
          <circle cx="44" cy="50" r="1" fill="white" />
          <ellipse cx="75" cy="52" rx="3" ry="5" fill="#333" />
          <circle cx="74" cy="50" r="1" fill="white" />
        </g>
      );

    case "angry":
      return (
        <g>
          <circle cx="45" cy="53" r="5" fill="#333" />
          <path
            d="M38,46 L52,49"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="75" cy="53" r="5" fill="#333" />
          <path
            d="M68,49 L82,46"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );

    case "sparkle":
      return (
        <g>
          <circle cx="45" cy="52" r="6" fill="#1a1a2e" />
          <circle cx="44" cy="50" r="1.5" fill="white" />
          <circle cx="48" cy="54" r="0.8" fill="white" />
          <path
            d="M38,46 L39,49 L42,46 L39,43 Z"
            fill="#FFD700"
            opacity="0.8"
          />
          <circle cx="75" cy="52" r="6" fill="#1a1a2e" />
          <circle cx="74" cy="50" r="1.5" fill="white" />
          <circle cx="78" cy="54" r="0.8" fill="white" />
          <path
            d="M82,44 L83,47 L86,44 L83,41 Z"
            fill="#FFD700"
            opacity="0.8"
          />
        </g>
      );

    case "star":
      return (
        <g>
          <path
            d="M45,46 L46.3,50.1 L50.6,50.1 L47.2,52.6 L48.5,56.6 L45,54.2 L41.5,56.6 L42.8,52.6 L39.4,50.1 L43.7,50.1 Z"
            fill="#FFD700"
          />
          <path
            d="M75,46 L76.3,50.1 L80.6,50.1 L77.2,52.6 L78.5,56.6 L75,54.2 L71.5,56.6 L72.8,52.6 L69.4,50.1 L73.7,50.1 Z"
            fill="#FFD700"
          />
        </g>
      );

    case "heart":
      return (
        <g>
          <path
            d="M45,55 C45,55 38,49.5 38,46 C38,43.2 40.2,42 42.5,43.5 C43.5,44.2 44.5,45.5 45,46 C45.5,45.5 46.5,44.2 47.5,43.5 C49.8,42 52,43.2 52,46 C52,49.5 45,55 45,55 Z"
            fill="#e74c3c"
          />
          <path
            d="M75,55 C75,55 68,49.5 68,46 C68,43.2 70.2,42 72.5,43.5 C73.5,44.2 74.5,45.5 75,46 C75.5,45.5 76.5,44.2 77.5,43.5 C79.8,42 82,43.2 82,46 C82,49.5 75,55 75,55 Z"
            fill="#e74c3c"
          />
        </g>
      );

    case "catEyes":
      return (
        <g>
          <ellipse cx="45" cy="52" rx="6" ry="5.5" fill="#5B9BA6" />
          <ellipse cx="45" cy="52" rx="2.5" ry="5.5" fill="#1a1a1a" />
          <circle cx="43.5" cy="50" r="1" fill="white" />
          <ellipse cx="75" cy="52" rx="6" ry="5.5" fill="#5B9BA6" />
          <ellipse cx="75" cy="52" rx="2.5" ry="5.5" fill="#1a1a1a" />
          <circle cx="73.5" cy="50" r="1" fill="white" />
        </g>
      );

    case "dogEyes":
      return (
        <g>
          <circle cx="45" cy="52" r="6.5" fill="#8B6914" />
          <circle cx="45" cy="52" r="4.5" fill="#3D2B1A" />
          <circle cx="43.5" cy="50" r="1.5" fill="white" />
          <circle cx="75" cy="52" r="6.5" fill="#8B6914" />
          <circle cx="75" cy="52" r="4.5" fill="#3D2B1A" />
          <circle cx="73.5" cy="50" r="1.5" fill="white" />
        </g>
      );

    case "bunnyEyes":
      return (
        <g>
          <ellipse cx="45" cy="52" rx="5.5" ry="5" fill="#FFB7C5" />
          <circle cx="45" cy="52" r="2.5" fill="#CC4477" />
          <circle cx="44" cy="50.5" r="1" fill="white" />
          <ellipse cx="75" cy="52" rx="5.5" ry="5" fill="#FFB7C5" />
          <circle cx="75" cy="52" r="2.5" fill="#CC4477" />
          <circle cx="74" cy="50.5" r="1" fill="white" />
        </g>
      );

    case "foxEyes":
      return (
        <g>
          <ellipse
            cx="45"
            cy="52"
            rx="7"
            ry="4.5"
            fill="#A0521A"
            transform="rotate(-8 45 52)"
          />
          <ellipse cx="45" cy="52" rx="3.5" ry="5" fill="#1a1a1a" />
          <circle cx="43.5" cy="50" r="1" fill="white" />
          <ellipse
            cx="75"
            cy="52"
            rx="7"
            ry="4.5"
            fill="#A0521A"
            transform="rotate(8 75 52)"
          />
          <ellipse cx="75" cy="52" rx="3.5" ry="5" fill="#1a1a1a" />
          <circle cx="73.5" cy="50" r="1" fill="white" />
        </g>
      );

    default:
      return (
        <g>
          <circle cx="45" cy="52" r="5" fill="#333" />
          <circle cx="75" cy="52" r="5" fill="#333" />
        </g>
      );
  }
}
