"use client";

import { useEffect } from "react";
import { attemptChunkReload, isChunkLoadError } from "@/lib/chunk-reload";

export default function ChunkReloadGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        event.preventDefault();
        attemptChunkReload();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        attemptChunkReload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
