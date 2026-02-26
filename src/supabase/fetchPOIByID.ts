import { createClient } from "./client";
import { PlacePointResult } from "./places";

function fetchPOIBYID(id: string, sourceTable: string) {
  const sb = createClient();
  return sb
    .from(sourceTable)
    .select("*")
    .eq("id", id)
    .single()
    .then(({ data, error }) => {
      if (error) throw error;
      const r = data;
      return {
        id: r.id,
        place_source_id: r.id,
        place_table: sourceTable,
        name_default: r.name_default,
        name_en: r.name_en ?? null,
        category: r.category ?? null,
        categories: r.categories ?? null,
        category_group: r.category_group ?? null,
        lat: r.lat,
        lng: r.lng,
        address: r.address ?? null,
        city: r.city ?? null,
        region: r.region ?? null,
        country: r.country ?? null,
        postal_code: r.postal_code ?? null,
        website_url: r.website_url ?? null,
        phone_number: r.phone_number ?? null,
        popularity_score: r.popularity_score ?? r.importance_score ?? null,
        is_top_destination: r.is_top_destination ?? null,
        metadata: r.metadata ?? null,
      } as PlacePointResult;
    });
}

export default fetchPOIBYID;
