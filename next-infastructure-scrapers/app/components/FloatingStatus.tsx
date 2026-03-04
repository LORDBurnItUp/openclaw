"use client";

import { useState, useRef, useCallback } from "react";

const defaultPosition = { x: 24, y: 24 };

export function FloatingStatus() {
  const [position, setPosition] = useState(defaultPosition);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [live, setLive] = useState(true);
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      setDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: position.x,
        startTop: position.y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [position]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setPosition({
        x: dragRef.current.startLeft + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startTop + (e.clientY - dragRef.current.startY),
      });
    },
    [dragging]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const openSmallWindow = useCallback(() => {
    window.open(
      "/",
      "VoxCode",
      "width=420,height=280,left=100,top=100,resizable=yes,scrollbars=yes"
    );
  }, []);

  return (
    <div
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      role="presentation"
    >
      {/* Main pill: always visible so you can see the app is on */}
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur transition-all ${
          live
            ? "border-emerald-400/60 bg-emerald-500/15 shadow-emerald-500/20"
            : "border-slate-600 bg-slate-800/90"
        } ${dragging ? "scale-105" : ""}`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            live ? "animate-pulse bg-emerald-400" : "bg-slate-500"
          }`}
          aria-hidden
        />
        <span className="text-xs font-medium text-slate-100 whitespace-nowrap">
          VoxCode • {live ? "Live" : "Paused"}
        </span>
        <button
          type="button"
          data-no-drag
          aria-label="Show options"
          className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded menu */}
      {expanded && (
        <div
          data-no-drag
          className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => {
              setLive((v) => !v);
              setExpanded(false);
            }}
          >
            {live ? "Pause status" : "Show Live again"}
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => {
              openSmallWindow();
              setExpanded(false);
            }}
          >
            Open in small window
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
          >
            Open dashboard in new tab
          </a>
        </div>
      )}
    </div>
  );
}
