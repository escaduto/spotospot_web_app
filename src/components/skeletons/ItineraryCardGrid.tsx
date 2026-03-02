function ItineraryCardGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-200" />
      ))}
    </div>
  );
}

export default ItineraryCardGrid;
