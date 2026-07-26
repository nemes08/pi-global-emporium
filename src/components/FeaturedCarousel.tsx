import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import type { MarketplaceItem } from "@/lib/marketplace";
import { MarketplaceCard } from "./MarketplaceCard";

export function FeaturedCarousel({ items }: { items: MarketplaceItem[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start", dragFree: true });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
  }, [embla, onSelect]);

  if (!items.length) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {items.map((it) => (
            <div key={it.listing.id} className="min-w-0 shrink-0 basis-[85%] sm:basis-[48%] lg:basis-[32%] xl:basis-[24%]">
              <MarketplaceCard item={it} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => embla?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous"
          className="btn-ghost-silver h-10 w-10 rounded-full text-sm disabled:opacity-30"
        >←</button>
        <button
          onClick={() => embla?.scrollNext()}
          disabled={!canNext}
          aria-label="Next"
          className="btn-ghost-silver h-10 w-10 rounded-full text-sm disabled:opacity-30"
        >→</button>
      </div>
    </div>
  );
}
