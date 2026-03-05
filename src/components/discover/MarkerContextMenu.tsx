"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LoginIcon from "@mui/icons-material/Login";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { NearbyPlan, DayItem } from "@/src/supabase/itineraries";
import {
  copyPublicDayToTrip,
  copyPublicItemToDay,
  getUserDayPlans,
} from "@/src/supabase/itineraries";

export interface ContextMenuState {
  x: number;
  y: number;
  plan: NearbyPlan;
}

interface Props {
  state: ContextMenuState | null;
  isAuthenticated: boolean;
  items: DayItem[]; // activities of the right-clicked plan
  onClose: () => void;
  onOpenAuth: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

/** Wrapper: renders nothing when state is null; keys inner content by plan ID
 *  so all local state resets automatically when a new marker is right-clicked. */
export default function MarkerContextMenu(props: Props) {
  if (!props.state) return null;
  return (
    <ContextMenuInner
      key={props.state.plan.id}
      {...props}
      state={props.state}
    />
  );
}

function ContextMenuInner({
  state,
  isAuthenticated,
  items,
  onClose,
  onOpenAuth,
}: Props & { state: ContextMenuState }) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Copy day status
  const [copyDayStatus, setCopyDayStatus] = useState<Status>("idle");

  // Add-activity modal
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const [userDays, setUserDays] = useState<
    { id: string; title: string; city: string | null }[]
  >([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [copyItemStatus, setCopyItemStatus] = useState<Status>("idle");

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const { x, y, plan } = state;

  // ── Clamp position so menu stays in viewport ───────────────────────────
  const menuW = 220;
  const menuH = 180;
  const clampedX = Math.min(x, window.innerWidth - menuW - 8);
  const clampedY = Math.min(y, window.innerHeight - menuH - 8);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCopyDay = async () => {
    setCopyDayStatus("loading");
    const result = await copyPublicDayToTrip(plan.id);
    setCopyDayStatus(result ? "success" : "error");
    if (result) setTimeout(onClose, 1400);
  };

  const handleOpenAddActivity = async () => {
    setAddActivityOpen(true);
    setDaysLoading(true);
    const days = await getUserDayPlans();
    setUserDays(days);
    setDaysLoading(false);
  };

  const handleCopyItem = async (targetDayId: string) => {
    if (!selectedItem) return;
    setCopyItemStatus("loading");
    const ok = await copyPublicItemToDay(selectedItem.id, targetDayId);
    setCopyItemStatus(ok ? "success" : "error");
    if (ok) setTimeout(onClose, 1400);
  };

  // ── Render: not authenticated ──────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ top: clampedY, left: clampedX, width: menuW }}
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-600 truncate">
            {plan.title ?? "Day plan"}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {[plan.city, plan.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <p className="text-xs text-gray-500 text-center mb-1">
            Sign in to save plans and more.
          </p>
          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="flex items-center justify-center gap-2 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <LoginIcon style={{ fontSize: 15 }} />
            Sign in / Sign up
          </button>
        </div>
      </div>
    );
  }

  // ── Render: add-activity flow ──────────────────────────────────────────

  if (addActivityOpen) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
        style={{ top: clampedY, left: clampedX, width: 260, maxHeight: 360 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
          {selectedItem ? (
            <button
              onClick={() => {
                setSelectedItem(null);
                setCopyItemStatus("idle");
              }}
              className="text-gray-400 hover:text-gray-700 transition"
            >
              <ArrowBackIcon style={{ fontSize: 16 }} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition"
            >
              <CloseIcon style={{ fontSize: 16 }} />
            </button>
          )}
          <span className="text-xs font-semibold text-gray-700 flex-1 truncate">
            {selectedItem
              ? `Copy "${selectedItem.title}" to…`
              : "Pick an activity"}
          </span>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* Step 1: pick activity */}
          {!selectedItem && (
            <>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center px-3">
                  No activities loaded yet. Click the marker first.
                </p>
              ) : (
                <ul className="py-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 text-gray-700 hover:text-teal-700 transition flex items-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {item.order_index}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Step 2: pick target day */}
          {selectedItem && (
            <>
              {copyItemStatus === "success" ? (
                <div className="flex flex-col items-center gap-2 py-5 px-3">
                  <CheckCircleIcon
                    className="text-teal-500"
                    style={{ fontSize: 30 }}
                  />
                  <p className="text-xs font-semibold text-teal-600">
                    Activity copied!
                  </p>
                </div>
              ) : copyItemStatus === "error" ? (
                <div className="flex flex-col items-center gap-2 py-5 px-3">
                  <ErrorOutlineIcon
                    className="text-red-400"
                    style={{ fontSize: 30 }}
                  />
                  <p className="text-xs font-semibold text-red-500">
                    Copy failed
                  </p>
                  <button
                    onClick={() => setCopyItemStatus("idle")}
                    className="text-[11px] text-gray-500 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : daysLoading ? (
                <div className="flex flex-col gap-2 px-3 py-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-7 bg-gray-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : userDays.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center px-3">
                  You have no day plans yet.{" "}
                  <Link
                    href="/create_new_plan"
                    className="text-teal-600 underline"
                  >
                    Create one
                  </Link>
                </p>
              ) : (
                <ul className="py-1">
                  {userDays.map((day) => (
                    <li key={day.id}>
                      <button
                        disabled={copyItemStatus === "loading"}
                        onClick={() => handleCopyItem(day.id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 text-gray-700 hover:text-teal-700 transition disabled:opacity-50"
                      >
                        <span className="font-medium truncate block">
                          {day.title}
                        </span>
                        {day.city && (
                          <span className="text-gray-400">{day.city}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Render: authenticated main menu ───────────────────────────────────

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ top: clampedY, left: clampedX, width: menuW }}
    >
      {/* Plan label */}
      <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">
            {plan.title ?? "Day plan"}
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            {[plan.city, plan.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-gray-600 transition ml-2 mt-0.5"
        >
          <CloseIcon style={{ fontSize: 15 }} />
        </button>
      </div>

      {/* Actions */}
      <div className="p-1.5 flex flex-col gap-0.5">
        {/* Save entire day plan */}
        <button
          onClick={handleCopyDay}
          disabled={copyDayStatus === "loading" || copyDayStatus === "success"}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition disabled:opacity-60"
        >
          {copyDayStatus === "success" ? (
            <CheckCircleIcon
              className="text-teal-500"
              style={{ fontSize: 16 }}
            />
          ) : copyDayStatus === "error" ? (
            <ErrorOutlineIcon
              className="text-red-400"
              style={{ fontSize: 16 }}
            />
          ) : (
            <BookmarkAddIcon style={{ fontSize: 16 }} />
          )}
          <span>
            {copyDayStatus === "loading"
              ? "Saving…"
              : copyDayStatus === "success"
                ? "Saved to your trips!"
                : copyDayStatus === "error"
                  ? "Failed — try again"
                  : "Save day plan to my trips"}
          </span>
        </button>

        {/* Copy individual activity */}
        <button
          onClick={handleOpenAddActivity}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition"
        >
          <AddCircleOutlineIcon style={{ fontSize: 16 }} />
          <span>Copy an activity to a day plan</span>
        </button>
      </div>
    </div>
  );
}
