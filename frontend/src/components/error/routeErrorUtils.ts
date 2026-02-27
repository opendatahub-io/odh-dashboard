import { isRouteErrorResponse } from 'react-router-dom';

const hasMessageField = (value: unknown): value is { message: unknown } =>
  typeof value === 'object' && value !== null && 'message' in value;

export const isChunkLoadError = (error: unknown): error is Error =>
  error instanceof Error &&
  (error.name === 'ChunkLoadError' ||
    /ChunkLoadError/i.test(error.message) ||
    /Loading chunk \S+ failed/i.test(error.message));

export const getRouteErrorDetails = (
  error: unknown,
): { title: string; errorMessage?: string; stack?: string } => {
  if (isRouteErrorResponse(error)) {
    const title = `${error.status} ${error.statusText}`.trim();
    let dataMessage: string | undefined;
    if (typeof error.data === 'string') {
      dataMessage = error.data;
    } else if (hasMessageField(error.data)) {
      dataMessage = String(error.data.message);
    }

    return {
      title: title || 'Route error',
      errorMessage: dataMessage || error.statusText || 'Route request failed',
    };
  }

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
