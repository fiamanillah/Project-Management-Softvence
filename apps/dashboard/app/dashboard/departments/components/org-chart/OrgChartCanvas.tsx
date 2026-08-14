"use client";

import * as React from "react";
import { Hand, Move } from "lucide-react";

interface OrgChartCanvasProps {
  children: React.ReactNode;
  zoomLevel: number;
}

export function OrgChartCanvas({ children, zoomLevel }: OrgChartCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const startPos = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Center the content on initial load
  React.useEffect(() => {
    const el = containerRef.current;
    if (el) {
      // Allow DOM layout to complete
      const timer = setTimeout(() => {
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;
        if (scrollWidth > clientWidth) {
          el.scrollLeft = (scrollWidth - clientWidth) / 2;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Mouse Drag Panning Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left click and avoid dragging when clicking inside interactive elements (buttons, inputs, dropdowns)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[role='menuitem']") ||
      target.closest("[data-slot='dropdown-menu']")
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);
    setHasInteracted(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    containerRef.current.scrollLeft = startPos.current.scrollLeft - dx;
    containerRef.current.scrollTop = startPos.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    const target = touch.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;

    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);
    setHasInteracted(true);
    startPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startPos.current.x;
    const dy = touch.clientY - startPos.current.y;

    containerRef.current.scrollLeft = startPos.current.scrollLeft - dx;
    containerRef.current.scrollTop = startPos.current.scrollTop - dy;
  };


  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/10 group">
      {/* Visual Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
        className={`w-full max-w-full overflow-x-auto overflow-y-auto p-8 min-h-[480px] max-h-[75vh] select-none transition-colors ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/40`}
        style={{
          scrollbarGutter: "stable",
          scrollBehavior: isDragging ? "auto" : "smooth",
        }}
      >
        <div
          className="inline-block min-w-full origin-top-left transition-transform duration-150"
          style={{
            zoom: `${zoomLevel}%`,
          }}
        >
          {children}
        </div>
      </div>


      {/* Floating Canvas Navigation Hint */}
      {!hasInteracted && (
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/90 border text-[11px] text-muted-foreground shadow-xs backdrop-blur-sm animate-in fade-in duration-300">
          <Move className="size-3 text-primary" />
          <span>Click & drag to pan &bull; Scroll to navigate</span>
        </div>
      )}
    </div>
  );
}
