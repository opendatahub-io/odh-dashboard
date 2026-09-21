import React from 'react';

/**
 * Falls back from a primary icon URL to a secondary URL when the image fails
 * to load. Mirrors MLflow `useIconFallback`.
 */
export const useIconFallback = (
  primarySrc: string | undefined,
  fallbackSrc: string | undefined,
): { activeSrc: string | undefined; onError: () => void } => {
  const [primaryFailed, setPrimaryFailed] = React.useState(false);
  const [fallbackFailed, setFallbackFailed] = React.useState(false);
  const [seenPrimarySrc, setSeenPrimarySrc] = React.useState(primarySrc);
  const [seenFallbackSrc, setSeenFallbackSrc] = React.useState(fallbackSrc);

  if (primarySrc !== seenPrimarySrc) {
    setSeenPrimarySrc(primarySrc);
    setPrimaryFailed(false);
  }
  if (fallbackSrc !== seenFallbackSrc) {
    setSeenFallbackSrc(fallbackSrc);
    setFallbackFailed(false);
  }

  const activeSrc =
    primarySrc && !primaryFailed
      ? primarySrc
      : fallbackSrc && !fallbackFailed && fallbackSrc !== primarySrc
        ? fallbackSrc
        : undefined;

  const onError = () => {
    if (activeSrc === primarySrc) {
      setPrimaryFailed(true);
    } else {
      setFallbackFailed(true);
    }
  };

  return { activeSrc, onError };
};
