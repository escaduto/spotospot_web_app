"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import {
  AvatarConfig,
  defaultAvatarConfig,
  backgroundOptions,
  eyeOptions,
  mouthOptions,
  noseOptions,
  earOptions,
  faceShapeOptions,
  accessoryOptions,
  blushOptions,
  skinToneOptions,
  hairOptions,
  hairColorOptions,
  gradients,
} from "./avatarTypes";

interface AvatarPickerProps {
  initialConfig?: Partial<AvatarConfig>;
  onSave: (config: AvatarConfig) => Promise<void> | void;
  onClose: () => void;
}

type Section =
  | "background"
  | "face"
  | "skin"
  | "hair"
  | "eyes"
  | "nose"
  | "mouth"
  | "ears"
  | "accessories"
  | "blush";

const SECTIONS: { key: Section; label: string; emoji: string }[] = [
  { key: "background", label: "Background", emoji: "🎨" },
  { key: "face", label: "Face Shape", emoji: "😶" },
  { key: "skin", label: "Avatar Color", emoji: "🎨" },
  { key: "hair", label: "Hair", emoji: "💇" },
  { key: "ears", label: "Ears", emoji: "👂" },
  { key: "eyes", label: "Eyes", emoji: "👁️" },
  { key: "nose", label: "Nose", emoji: "👃" },
  { key: "mouth", label: "Mouth", emoji: "👄" },
  { key: "accessories", label: "Accessories", emoji: "👒" },
  { key: "blush", label: "Blush", emoji: "✨" },
];

function OptionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? "bg-teal-500 text-white border-teal-500 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-600"
      }`}
    >
      {label}
    </button>
  );
}

export default function AvatarPicker({
  initialConfig,
  onSave,
  onClose,
}: AvatarPickerProps) {
  const [config, setConfig] = useState<AvatarConfig>({
    ...defaultAvatarConfig,
    ...initialConfig,
  });
  const [activeSection, setActiveSection] = useState<Section>("background");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(config);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function randomize() {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    setConfig({
      background: pick(backgroundOptions),
      eyes: pick(eyeOptions),
      mouth: pick(mouthOptions),
      nose: pick(noseOptions),
      ears: pick(earOptions),
      faceShape: pick(faceShapeOptions),
      accessories: pick(accessoryOptions),
      blush: pick(blushOptions),
      skinTone: pick(skinToneOptions).value,
      hair: pick(hairOptions),
      hairColor: pick(hairColorOptions).value,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Customize Avatar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={randomize}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition"
            >
              🎲 Randomize
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: preview */}
          <div className="w-44 shrink-0 flex flex-col items-center justify-center gap-4 bg-gray-50 border-r border-gray-100 p-4">
            <div className="rounded-full overflow-hidden shadow-lg ring-4 ring-white">
              <Avatar config={config} size={120} />
            </div>
            <p className="text-xs text-gray-400 text-center">Live preview</p>
          </div>

          {/* Right: options */}
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Section tabs */}
            <div className="flex overflow-x-auto gap-1 p-2 border-b border-gray-100 no-scrollbar">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                    activeSection === s.key
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Options area */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeSection === "background" && (
                <div className="grid grid-cols-5 gap-2">
                  {backgroundOptions.map((bg) => {
                    const [s, e] = gradients[bg];
                    return (
                      <button
                        key={bg}
                        onClick={() => set("background", bg)}
                        title={bg}
                        className={`aspect-square rounded-xl transition-all ${
                          config.background === bg
                            ? "ring-3 ring-teal-500 ring-offset-2 scale-105"
                            : "hover:scale-105"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${s}, ${e})`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {activeSection === "skin" && (
                <div className="flex flex-wrap gap-3">
                  {skinToneOptions.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => set("skinTone", t.value)}
                      title={t.label}
                      className={`flex flex-col items-center gap-1 transition-all ${
                        config.skinTone === t.value
                          ? "scale-110"
                          : "hover:scale-105"
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-full border-2 ${
                          config.skinTone === t.value
                            ? "border-teal-500 shadow-md"
                            : "border-gray-200"
                        }`}
                        style={{ background: t.value }}
                      />
                      <span className="text-xs text-gray-500">{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeSection === "face" && (
                <div className="flex flex-wrap gap-2">
                  {faceShapeOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.faceShape === opt}
                      onClick={() => set("faceShape", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "hair" && (
                <div className="space-y-4">
                  {/* Color swatches */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hairColorOptions.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => set("hairColor", t.value)}
                          title={t.label}
                          className={`flex flex-col items-center gap-1 transition-all ${
                            config.hairColor === t.value
                              ? "scale-110"
                              : "hover:scale-105"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-full border-2 ${
                              config.hairColor === t.value
                                ? "border-teal-500 shadow-md"
                                : "border-gray-200"
                            }`}
                            style={{ background: t.value }}
                          />
                          <span className="text-xs text-gray-500 leading-tight text-center w-10 truncate">
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Style chips */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Style
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hairOptions.map((opt) => (
                        <OptionChip
                          key={opt}
                          label={opt}
                          selected={config.hair === opt}
                          onClick={() => set("hair", opt)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "ears" && (
                <div className="flex flex-wrap gap-2">
                  {earOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.ears === opt}
                      onClick={() => set("ears", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "eyes" && (
                <div className="flex flex-wrap gap-2">
                  {eyeOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.eyes === opt}
                      onClick={() => set("eyes", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "nose" && (
                <div className="flex flex-wrap gap-2">
                  {noseOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.nose === opt}
                      onClick={() => set("nose", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "mouth" && (
                <div className="flex flex-wrap gap-2">
                  {mouthOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.mouth === opt}
                      onClick={() => set("mouth", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "accessories" && (
                <div className="flex flex-wrap gap-2">
                  {accessoryOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.accessories === opt}
                      onClick={() => set("accessories", opt)}
                    />
                  ))}
                </div>
              )}

              {activeSection === "blush" && (
                <div className="flex flex-wrap gap-2">
                  {blushOptions.map((opt) => (
                    <OptionChip
                      key={opt}
                      label={opt}
                      selected={config.blush === opt}
                      onClick={() => set("blush", opt)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow hover:brightness-110 transition disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>
  );
}
