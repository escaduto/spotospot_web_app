import Background from "./Background";
import FaceShape from "./FaceShape";
import Accessories from "./Accessories";
import Blush from "./Blush";
import { AvatarConfig, defaultAvatarConfig } from "./avatarTypes";
import Ears from "./Ears";
import Eyes from "./Eyes";
import Hair from "./Hair";
import Nose from "./Nose";
import Mouth from "./Mouth";

interface AvatarProps {
  config?: Partial<AvatarConfig>;
  size?: number;
  className?: string;
}

export default function Avatar({
  config = {},
  size = 120,
  className,
}: AvatarProps) {
  const cfg: AvatarConfig = { ...defaultAvatarConfig, ...config };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ borderRadius: "50%", display: "block" }}
    >
      <Background type={cfg.background} />
      <Ears type={cfg.ears} skinTone={cfg.skinTone} />
      <Hair type={cfg.hair} color={cfg.hairColor} layer="back" />
      <FaceShape type={cfg.faceShape} skinTone={cfg.skinTone} />
      <Hair type={cfg.hair} color={cfg.hairColor} layer="front" />
      <Blush type={cfg.blush} />
      <Eyes type={cfg.eyes} />
      <Nose type={cfg.nose} />
      <Mouth type={cfg.mouth} />
      <Accessories type={cfg.accessories} />
    </svg>
  );
}
