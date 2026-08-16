"use client";

import { useEffect, useRef, useState } from "react";

export function MobileSwipeRail({
  items,
  getKey,
  renderItem,
  shellClassName = "",
  railClassName = ""
}) {
  const railRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);

    if (railRef.current) {
      railRef.current.scrollLeft = 0;
    }
  }, [items.length]);

  function handleScroll(event) {
    const element = event.currentTarget;
    const slideWidth = element.clientWidth;

    if (!slideWidth) {
      return;
    }

    const nextIndex = Math.round(element.scrollLeft / slideWidth);
    const clampedIndex = Math.max(0, Math.min(nextIndex, items.length - 1));

    setActiveIndex(clampedIndex);
  }

  return (
    <div className={`mobile-swipe-rail-shell ${shellClassName}`.trim()}>
      <div
        ref={railRef}
        className={`mobile-swipe-rail ${railClassName}`.trim()}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <div key={getKey(item, index)} className="mobile-swipe-rail-slide">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="mobile-swipe-rail-dots" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={getKey(item, index)}
              className={`mobile-swipe-rail-dot ${
                index === activeIndex ? "mobile-swipe-rail-dot-active" : ""
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
