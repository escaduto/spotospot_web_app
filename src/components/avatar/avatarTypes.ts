// ─── Avatar Config Types ──────────────────────────────────────────────────────

export interface AvatarConfig {
  background: string;
  eyes: string;
  mouth: string;
  nose: string;
  ears: string;
  faceShape: string;
  accessories: string;
  blush: string;
  skinTone: string;
  hair: string;
  hairColor: string;
}

export const defaultAvatarConfig: AvatarConfig = {
  background: "sky",
  eyes: "round",
  mouth: "smile",
  nose: "dot",
  ears: "round",
  faceShape: "round",
  accessories: "none",
  blush: "none",
  skinTone: "#F5D6C6",
  hair: "short",
  hairColor: "#3D2B1A",
};

// ─── Options ─────────────────────────────────────────────────────────────────

export const backgroundOptions = [
  "sunset",
  "ocean",
  "purple",
  "forest",
  "sky",
  "peach",
  "midnight",
  "gold",
  "teal",
  "rose",
  "lava",
  "mint",
  "neon",
  "sand",
  "cloud",
];

export const eyeOptions = [
  "round",
  "small",
  "sleepy",
  "smile",
  "wink",
  "wide",
  "dot",
  "oval",
  "angry",
  "sparkle",
  "star",
  "heart",
  "catEyes",
  "dogEyes",
  "bunnyEyes",
  "foxEyes",
];

export const mouthOptions = [
  "none",
  "smile",
  "bigSmile",
  "openSmile",
  "grin",
  "laugh",
  "smirk",
  "neutral",
  "flat",
  "sad",
  "frown",
  "tongue",
  "surprised",
];

export const noseOptions = [
  "none",
  "dot",
  "small",
  "triangle",
  "button",
  "long",
  "round",
  "catNose",
  "dogNose",
  "bunnyNose",
  "pigNose",
];

export const earOptions = [
  "none",
  "round",
  "pointed",
  "floppy",
  "catEars",
  "dogEars",
  "bunnyEars",
  "bearEars",
  "foxEars",
  "mouseEars",
];

export const faceShapeOptions = [
  "none",
  "round",
  "oval",
  "square",
  "heart",
  "diamond",
];

export const accessoryOptions = [
  "none",
  "glasses",
  "sunglasses",
  "monocle",
  "hat",
  "beanie",
  "crown",
  "headband",
  "bow",
  "flowerCrown",
];

export const blushOptions = ["none", "round", "oval", "sparkle", "star"];

export const hairOptions = [
  "none",
  "short",
  "bob",
  "long",
  "wavy",
  "pigtails",
  "bun",
  "braids",
];

export const hairColorOptions = [
  { label: "Black", value: "#1A0F00" },
  { label: "Dark Brown", value: "#3D2B1A" },
  { label: "Brown", value: "#8B5E3C" },
  { label: "Light Brown", value: "#C19A6B" },
  { label: "Blonde", value: "#E8C97A" },
  { label: "Platinum", value: "#F0EDD8" },
  { label: "Auburn", value: "#9B3524" },
  { label: "Red", value: "#C8401A" },
  { label: "Pink", value: "#F08098" },
  { label: "Lilac", value: "#A878C8" },
  { label: "Blue", value: "#2860B0" },
  { label: "Teal", value: "#207870" },
  { label: "Silver", value: "#A0A4A8" },
  { label: "White", value: "#F0EEE8" },
];

export const skinToneOptions = [
  { label: "Porcelain", value: "#F5D6C6" },
  { label: "Sand", value: "#E8B48A" },
  { label: "Honey", value: "#C8875A" },
  { label: "Caramel", value: "#A06840" },
  { label: "Sienna", value: "#784830" },
  { label: "Espresso", value: "#503020" },
  { label: "Rose", value: "#F0DCE4" },
  { label: "Olive", value: "#C8A870" },
  { label: "Lavender", value: "#C4A8DC" },
  { label: "Mint", value: "#8CBCAC" },
  { label: "Sky", value: "#88AAD0" },
  { label: "Coral", value: "#E88880" },
  { label: "Lemon", value: "#E0D498" },
  { label: "Sage", value: "#9AAE94" },
  { label: "Slate", value: "#8898AC" },
  { label: "Gold", value: "#D4B05A" },
];

// ─── Gradients (re-exported here for convenience) ─────────────────────────────

export const gradients: Record<string, [string, string]> = {
  sunset: ["#ff7e5f", "#feb47b"],
  ocean: ["#2193b0", "#6dd5ed"],
  purple: ["#cc2b5e", "#753a88"],
  forest: ["#134E5E", "#71B280"],
  sky: ["#56CCF2", "#2F80ED"],
  peach: ["#ED4264", "#FFEDBC"],
  midnight: ["#232526", "#414345"],
  gold: ["#F7971E", "#FFD200"],
  teal: ["#136a8a", "#267871"],
  rose: ["#ff9966", "#ff5e62"],
  lava: ["#200122", "#6f0000"],
  mint: ["#76b852", "#8DC26F"],
  neon: ["#12c2e9", "#c471ed"],
  sand: ["#c79081", "#dfa579"],
  cloud: ["#ECE9E6", "#FFFFFF"],
};
