// FaceShape: renders the face silhouette with the given skin tone
// All shapes roughly fit within cx=60, cy=60, r=40 bounding area

interface FaceShapeProps {
  type: string;
  skinTone?: string;
}

export default function FaceShape({
  type,
  skinTone = "#F5D6C6",
}: FaceShapeProps) {
  switch (type) {
    case "none":
      return null;
    case "round":
      return <circle cx="60" cy="60" r="40" fill={skinTone} />;

    case "oval":
      return <ellipse cx="60" cy="62" rx="35" ry="42" fill={skinTone} />;

    case "square":
      return (
        <rect x="22" y="22" width="76" height="76" rx="12" fill={skinTone} />
      );

    case "heart":
      return (
        <path
          d="M60,96 C52,90 20,74 20,50 C20,36 30,28 40,30 C45,31 52,35 60,44 C68,35 75,31 80,30 C90,28 100,36 100,50 C100,74 68,90 60,96 Z"
          fill={skinTone}
        />
      );

    case "diamond":
      return (
        <path
          d="M60,20 Q80,40 100,60 Q80,80 60,100 Q40,80 20,60 Q40,40 60,20 Z"
          fill={skinTone}
        />
      );

    default:
      return <circle cx="60" cy="60" r="40" fill={skinTone} />;
  }
}
