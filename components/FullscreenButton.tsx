"use client";

import { useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function FullscreenButton({ targetId }: { targetId: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [targetId]);

  return (
    <button
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="absolute top-3 right-3 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-lg transition backdrop-blur-sm"
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4" />
      ) : (
        <Maximize2 className="w-4 h-4" />
      )}
    </button>
  );
}
