"use client";

import dynamic from "next/dynamic";

const CreatePlanPage = dynamic(
  () => import("@/src/components/create_plan/CreatePlanPage"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">🗺️</span>
          <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
        </div>
      </div>
    ),
  },
);

export default function CreateNewPlanPage() {
  return <CreatePlanPage />;
}
