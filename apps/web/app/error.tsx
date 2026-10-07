"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { attemptChunkReload, isChunkLoadError } from "@/lib/chunk-reload";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      attemptChunkReload();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return null;
  }

  return <ErrorFallback />;
}
