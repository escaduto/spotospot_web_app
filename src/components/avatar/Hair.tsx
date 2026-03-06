// Hair is rendered in two passes:
//   layer="back"  → before FaceShape  (back/sides/long strands behind the face)
//   layer="front" → after Mouth       (top dome, bangs, bun — covers face edges)
//
// Face circle: cx=60, cy=60, r=40  →  top y=20, sides x=20/100, bottom y=100
// Eyes sit at y=52. Hair front should stay above or use natural curves.

interface HairProps {
  type: string;
  color?: string;
  layer: "back" | "front";
}

export default function Hair({ type, color = "#3D2B1A", layer }: HairProps) {
  if (type === "none") return null;

  const c = color;

  switch (type) {
    // ─────────────────────────────────────────── SHORT ──
    case "short":
      if (layer === "back") return null;
      return (
        <path
          d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z"
          fill={c}
        />
      );

    // ─────────────────────────────────────────── BOB ──
    case "bob":
      if (layer === "back") {
        return (
          <g fill={c}>
            <path d="M18,56 Q13,66 15,86 Q17,94 26,88 Q19,74 19,58 Z" />
            <path d="M102,56 Q107,66 105,86 Q103,94 94,88 Q101,74 101,58 Z" />
          </g>
        );
      }
      return (
        <g fill={c}>
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          <path d="M18,56 Q15,70 17,82 Q19,89 26,85 Q21,73 21,60 Z" />
          <path d="M102,56 Q105,70 103,82 Q101,89 94,85 Q99,73 99,60 Z" />
        </g>
      );

    // ─────────────────────────────────────────── LONG ──
    case "long":
      if (layer === "back") {
        return (
          <g fill={c}>
            <path d="M18,56 Q10,72 13,114 Q20,120 30,114 Q21,84 20,58 Z" />
            <path d="M102,56 Q110,72 107,114 Q100,120 90,114 Q99,84 100,58 Z" />
          </g>
        );
      }
      return (
        <g fill={c}>
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* thin side strands framing the face */}
          <path d="M18,56 Q15,68 17,82 Q19,88 23,84 Q20,72 20,60 Z" />
          <path d="M102,56 Q105,68 103,82 Q101,88 97,84 Q100,72 100,60 Z" />
        </g>
      );

    // ─────────────────────────────────────────── BANGS ──
    case "bangs":
      if (layer === "back") return null;
      return (
        <g fill={c}>
          {/* hair base on top */}
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* uneven fringe hanging onto forehead */}
          <path
            d="M18,56
               Q24,67 32,60
               Q39,68 47,61
               Q53,68 60,62
               Q67,68 73,61
               Q81,68 88,60
               Q96,67 102,56
               Q94,62 60,63
               Q26,62 18,56 Z"
            fill={c}
          />
        </g>
      );

    // ─────────────────────────────────────────── CURLY ──
    case "curly":
      if (layer === "back") {
        return (
          <g fill={c}>
            <ellipse cx="15" cy="56" rx="13" ry="22" />
            <circle cx="9" cy="44" r="8" />
            <circle cx="11" cy="62" r="8" />
            <circle cx="11" cy="74" r="7" />
            <ellipse cx="105" cy="56" rx="13" ry="22" />
            <circle cx="111" cy="44" r="8" />
            <circle cx="109" cy="62" r="8" />
            <circle cx="109" cy="74" r="7" />
          </g>
        );
      }
      return (
        <g fill={c}>
          {/* wide dome */}
          <ellipse cx="60" cy="30" rx="50" ry="26" />
          {/* bumpy perimeter circles */}
          <circle cx="12" cy="46" r="10" />
          <circle cx="16" cy="26" r="10" />
          <circle cx="33" cy="12" r="11" />
          <circle cx="52" cy="5" r="11" />
          <circle cx="68" cy="5" r="11" />
          <circle cx="87" cy="12" r="11" />
          <circle cx="104" cy="26" r="10" />
          <circle cx="108" cy="46" r="10" />
        </g>
      );

    // ─────────────────────────────────────────── WAVY ──
    case "wavy":
      if (layer === "back") {
        return (
          <g fill={c}>
            <path d="M18,56 Q11,68 15,82 Q13,90 18,96 Q16,90 20,84 Q18,72 20,62 Z" />
            <path d="M102,56 Q109,68 105,82 Q107,90 102,96 Q104,90 100,84 Q102,72 100,62 Z" />
          </g>
        );
      }
      return (
        <g fill={c}>
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          <path d="M18,56 Q15,68 17,82 Q19,88 23,84 Q20,74 20,62 Z" />
          <path d="M102,56 Q105,68 103,82 Q101,88 97,84 Q100,74 100,62 Z" />
        </g>
      );

    // ─────────────────────────────────────────── PONYTAIL ──
    case "ponytail":
      if (layer === "back") {
        return (
          <g fill={c}>
            {/* ponytail shaft */}
            <path d="M47,40 Q42,54 44,84 Q48,104 55,116 Q60,120 65,116 Q72,104 76,84 Q78,54 73,40 Q67,46 60,46 Q53,46 47,40 Z" />
            {/* elastic */}
            <ellipse cx="60" cy="56" rx="11" ry="4" fill="#FF8888" />
          </g>
        );
      }
      return (
        <g fill={c}>
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* sides swept back to meet ponytail */}
          <path d="M18,56 Q15,62 17,68 Q22,63 24,58 Z" />
          <path d="M102,56 Q105,62 103,68 Q98,63 96,58 Z" />
        </g>
      );

    // ─────────────────────────────────────────── PIGTAILS ──
    case "pigtails":
      if (layer === "back") return null;
      return (
        <g fill={c}>
          {/* dome */}
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* left pigtail */}
          <path d="M18,60 Q10,70 12,92 Q14,100 20,96 Q18,82 19,68 Z" />
          <ellipse cx="16" cy="84" rx="7" ry="3" fill="#FF8888" />
          {/* right pigtail */}
          <path d="M102,60 Q110,70 108,92 Q106,100 100,96 Q102,82 101,68 Z" />
          <ellipse cx="104" cy="84" rx="7" ry="3" fill="#FF8888" />
        </g>
      );

    // ─────────────────────────────────────────── BUN ──
    case "bun":
      if (layer === "back") return null;
      return (
        <g fill={c}>
          {/* tight dome */}
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* bun mound on top */}
          <circle cx="60" cy="7" r="13" fill={c} />
          {/* hair tie / knot indent */}
          <ellipse cx="60" cy="19" rx="11" ry="4" fill={c} opacity="0.75" />
          <ellipse cx="60" cy="19" rx="6" ry="2" fill="rgba(0,0,0,0.12)" />
        </g>
      );

    // ─────────────────────────────────────────── AFRO ──
    case "afro":
      if (layer === "back") {
        return <ellipse cx="60" cy="42" rx="56" ry="40" fill={c} />;
      }
      return (
        <g fill={c}>
          <ellipse cx="60" cy="38" rx="52" ry="36" />
          {/* bumpy perimeter */}
          <circle cx="10" cy="50" r="10" />
          <circle cx="13" cy="28" r="10" />
          <circle cx="28" cy="11" r="11" />
          <circle cx="50" cy="4" r="11" />
          <circle cx="70" cy="4" r="11" />
          <circle cx="92" cy="11" r="11" />
          <circle cx="107" cy="28" r="10" />
          <circle cx="110" cy="50" r="10" />
        </g>
      );

    // ─────────────────────────────────────────── BRAIDS ──
    case "braids":
      if (layer === "back") {
        return (
          <g>
            {/* left braid */}
            <path
              d="M18,60 Q11,76 13,104 Q15,112 22,108 Q20,92 20,74 Z"
              fill={c}
            />
            <ellipse cx="16" cy="76" rx="5" ry="3.5" fill={c} opacity="0.55" />
            <ellipse cx="16" cy="88" rx="5" ry="3.5" fill={c} opacity="0.55" />
            <ellipse cx="16" cy="100" rx="5" ry="3.5" fill={c} opacity="0.55" />
            {/* right braid */}
            <path
              d="M102,60 Q109,76 107,104 Q105,112 98,108 Q100,92 100,74 Z"
              fill={c}
            />
            <ellipse cx="104" cy="76" rx="5" ry="3.5" fill={c} opacity="0.55" />
            <ellipse cx="104" cy="88" rx="5" ry="3.5" fill={c} opacity="0.55" />
            <ellipse
              cx="104"
              cy="100"
              rx="5"
              ry="3.5"
              fill={c}
              opacity="0.55"
            />
          </g>
        );
      }
      return (
        <g fill={c}>
          {/* dome */}
          <path d="M18,56 Q18,14 60,12 Q102,14 102,56 Q94,44 60,42 Q26,44 18,56 Z" />
          {/* center part */}
          <line
            x1="60"
            y1="12"
            x2="60"
            y2="42"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="2"
            fill="none"
          />
        </g>
      );

    default:
      return null;
  }
}
