"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import AddIcon from "@mui/icons-material/Add";
import PublicIcon from "@mui/icons-material/Public";
import AirplaneTicketIcon from "@mui/icons-material/AirplaneTicket";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";

// ─── Shared condensed row ─────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  ctaGradient: string;
  borderColor: string;
  bgColor: string;
  iconBg: string;
}

function CollapsibleEmpty({
  icon,
  label,
  description,
  ctaLabel,
  ctaHref,
  ctaGradient,
  borderColor,
  bgColor,
  iconBg,
}: EmptyStateProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl border-2 border-dashed ${borderColor} ${bgColor} overflow-hidden`}
    >
      {/* ── Condensed row (always visible) ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition-all"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-600">
          {label}
        </span>
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            color: "#9ca3af",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Expanded full view ── */}
      <Collapse in={expanded}>
        <div className="px-6 pb-10 pt-4 text-center">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
          >
            {icon}
          </div>
          <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
            {description}
          </p>
          <Button
            component={Link}
            href={ctaHref}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              mt: 2.5,
              borderRadius: 9999,
              textTransform: "none",
              background: ctaGradient,
              fontWeight: 600,
              "&:hover": { filter: "brightness(1.1)" },
            }}
          >
            {ctaLabel}
          </Button>
        </div>
      </Collapse>
    </div>
  );
}

// ─── Per-section variants ─────────────────────────────────────────────────────

function EmptyPublicTrips() {
  return (
    <CollapsibleEmpty
      icon={<PublicIcon sx={{ color: "#059669", fontSize: 16 }} />}
      label="No public plans yet"
      description="Publish a day plan to make it discoverable by the SpotoSpot community — others can add it to their own trips."
      ctaLabel="Create a Plan"
      ctaHref="/create_new_plan"
      ctaGradient="linear-gradient(to right, #0d9488, #06b6d4)"
      borderColor="border-emerald-200"
      bgColor="bg-emerald-50/40"
      iconBg="bg-emerald-100"
    />
  );
}

function EmptyPrivateTrips() {
  return (
    <CollapsibleEmpty
      icon={<EditNoteIcon sx={{ color: "#d97706", fontSize: 16 }} />}
      label="No draft day plans"
      description="Draft plans are your private workspace. Build a day plan, then publish it or attach it to a trip when you're ready."
      ctaLabel="Start a Draft"
      ctaHref="/create_new_plan"
      ctaGradient="linear-gradient(to right, #f59e0b, #fb923c)"
      borderColor="border-amber-200"
      bgColor="bg-amber-50/40"
      iconBg="bg-amber-100"
    />
  );
}

function EmptyTrips() {
  return (
    <CollapsibleEmpty
      icon={<AirplaneTicketIcon sx={{ color: "#0891b2", fontSize: 16 }} />}
      label="No trips yet"
      description="Trips tie together dates, day plans, collaborators, and travel documents in one place."
      ctaLabel="Plan a Trip"
      ctaHref="/create_new_plan"
      ctaGradient="linear-gradient(to right, #0d9488, #06b6d4)"
      borderColor="border-cyan-200"
      bgColor="bg-cyan-50/40"
      iconBg="bg-cyan-100"
    />
  );
}

export { EmptyPublicTrips, EmptyPrivateTrips, EmptyTrips };
