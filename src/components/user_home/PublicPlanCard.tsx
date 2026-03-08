"use client";

import { ItineraryDay } from "@/src/supabase/types";
import Image from "next/image";

/** Square thumbnail grid card for publicly published day plans */
function PublicPlanCard({ plan }: { plan: ItineraryDay }) {
  return (
    <a
      href={`/day/${plan.id}`}
      className="group relative overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-md transition-all"
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* Cover image */}
      {plan.image_url ? (
        <Image
          src={plan.image_url}
          blurDataURL={
            plan.image_blurhash
              ? `data:image/jpeg;base64,${plan.image_blurhash}`
              : undefined
          }
          placeholder={plan.image_blurhash ? "blur" : undefined}
          alt={plan.title || "Day plan"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 16vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
          🗺️
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-transparent" />

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow">
          {plan.title || "Untitled Plan"}
        </p>
        {plan.city && (
          <p className="text-white/60 text-[10px] mt-0.5 truncate">
            {plan.city}
          </p>
        )}
      </div>
    </a>
  );
}

export default PublicPlanCard;
