"use client";

import { useRef } from "react";
import type { ItineraryItem } from "@/src/supabase/types";
import { parsePoint } from "@/src/utils/geo";

interface Props {
  item: ItineraryItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  disabled: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  isDragging: boolean;
}

export default function ActivityItem({
  item,
  index,
  isSelected,
  onSelect,
  onEdit,
  disabled,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
  isDragging,
}: Props) {
  const coords = parsePoint(item.location_coords);
  const dragHandleRef = useRef<HTMLSpanElement>(null);

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`p-3 rounded-lg group cursor-pointer transition-all ${
        isDragging
          ? "opacity-40"
          : isDragOver
            ? "border-t-2 border-t-blue-500"
            : ""
      } ${
        isSelected
          ? "bg-blue-50 border-2 border-blue-500"
          : "bg-gray-50 border-2 border-transparent hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          ref={dragHandleRef}
          className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            !disabled ? "cursor-grab active:cursor-grabbing" : ""
          } ${
            isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
          }`}
        >
          {item.order_index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900">{item.title}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {item.item_type && (
                  <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {item.item_type}
                  </span>
                )}
                {item.location_name && (
                  <span className="text-[10px] text-gray-500">
                    📍 {item.location_name}
                  </span>
                )}
                {item.duration_minutes && (
                  <span className="text-[10px] text-gray-500">
                    ⏱️ {item.duration_minutes}min
                  </span>
                )}
                {item.place_id && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    ✓ Matched
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              {coords && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
            </div>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="opacity-0 group-hover:opacity-100 transition text-xs text-blue-600 underline shrink-0"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
