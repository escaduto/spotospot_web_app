"use client";

import { Category_Types } from "@/src/types/itinerary";

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CategoryPillSelector({ selected, onChange }: Props) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {Category_Types.map((cat) => {
        const isSelected = selected.includes(cat.value);
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => toggle(cat.value)}
            title={cat.details}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
              isSelected
                ? "text-white border-transparent shadow-sm scale-[1.04]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            style={
              isSelected
                ? { backgroundColor: cat.color, borderColor: cat.color }
                : {}
            }
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
