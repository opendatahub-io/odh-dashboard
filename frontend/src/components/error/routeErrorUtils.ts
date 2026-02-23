export const isChunkLoadError = (error: unknown): error is Error =>
  error instanceof Error &&
  (error.name === 'ChunkLoadError' ||
    /ChunkLoadError/i.test(error.message) ||
    /Loading chunk [\d]+ failed/i.test(error.message));

export const getRouteErrorDetails = (
  error: unknown,
): { title: string; errorMessage?: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      title: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      title: 'Route error',
      errorMessage: error,
    };
  }

  return {
    title: 'Route error',
    errorMessage: 'Unknown route error',
  };
};
