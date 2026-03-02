"use client";

import { useState, useRef } from "react";
import type { ItineraryItem } from "@/src/supabase/types";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";

interface Props {
  /** Items sorted by order_index */
  items: ItineraryItem[];
  onSave: (orderedIds: string[]) => void;
  onCancel: () => void;
}

export default function MapReorderPanel({ items, onSave, onCancel }: Props) {
  const [order, setOrder] = useState<ItineraryItem[]>(() =>
    [...items].sort((a, b) => a.order_index - b.order_index),
  );
  const dragIdxRef = useRef<number | null>(null);
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragIdxRef.current = idx;
    setDragFromIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    setDragOverIdx(toIdx);
  };

  const handleDrop = (toIdx: number) => {
    const fromIdx = dragIdxRef.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrder(next);
    dragIdxRef.current = null;
    setDragFromIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdxRef.current = null;
    setDragFromIdx(null);
    setDragOverIdx(null);
  };

  const handleSave = () => {
    const confirmed = window.confirm(
      "Save this new activity order?\n\nTime slots will be reassigned — the activity at each position inherits the time slot currently at that position.",
    );
    if (confirmed) onSave(order.map((i) => i.id));
  };

  return (
    <div className="absolute right-16 bottom-6 z-30 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <DragIndicatorIcon style={{ fontSize: 14, color: "#6b7280" }} />
          Reorder Activities
        </p>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 flex items-center"
        >
          <CloseIcon style={{ fontSize: 14 }} />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 px-3 pt-2 pb-1 shrink-0">
        Drag to reorder. Time slots follow position, not activity.
      </p>

      {/* Sortable list */}
      <div className="overflow-y-auto flex-1 py-1">
        {order.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none transition-colors ${
              dragOverIdx === idx && dragFromIdx !== idx
                ? "border-t-2 border-blue-400 bg-blue-50"
                : "hover:bg-gray-50 border-t border-gray-50"
            }`}
          >
            <span
              className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: "#2563eb" }}
            >
              {idx + 1}
            </span>
            <p className="flex-1 text-xs text-gray-800 font-medium truncate">
              {item.title}
            </p>
            {item.start_time && (
              <span className="text-[9px] text-gray-400 shrink-0">
                {item.start_time.slice(0, 5)}
              </span>
            )}
            <DragIndicatorIcon style={{ fontSize: 14, color: "#9ca3af" }} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50 shrink-0">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <SaveIcon style={{ fontSize: 11 }} /> Save order
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
