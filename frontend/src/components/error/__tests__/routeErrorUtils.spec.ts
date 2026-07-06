import { getRouteErrorDetails, isChunkLoadError } from '#~/components/error/routeErrorUtils';

describe('isChunkLoadError', () => {
  it('should return true when error name is ChunkLoadError', () => {
    const error = new Error('network failure');
    error.name = 'ChunkLoadError';

    expect(isChunkLoadError(error)).toBe(true);
  });

  it('should return true when message matches webpack chunk failure pattern', () => {
    const error = new Error('Loading chunk 145 failed.');

    expect(isChunkLoadError(error)).toBe(true);
  });

  it('should return true when message contains a named chunk id', () => {
    const error = new Error('Loading chunk src_images_icons_SettingsNavIcon_tsx failed.');

    expect(isChunkLoadError(error)).toBe(true);
  });

  it('should return false for non-chunk errors', () => {
    expect(isChunkLoadError(new Error('regular error'))).toBe(false);
    expect(isChunkLoadError('ChunkLoadError')).toBe(false);
  });
});

describe('getRouteErrorDetails', () => {
  it('should return route error response string data as message', () => {
    const routeErrorResponse = {
      status: 500,
      statusText: 'Server Error',
      data: 'Backend unavailable',
      internal: false,
    };

    expect(getRouteErrorDetails(routeErrorResponse)).toEqual({
      title: '500 Server Error',
      errorMessage: 'Backend unavailable',
    });
  });

  it('should return route error response details', () => {
    const routeErrorResponse = {
      status: 404,
      statusText: 'Not Found',
      data: { message: 'Project does not exist' },
      internal: false,
    };

    expect(getRouteErrorDetails(routeErrorResponse)).toEqual({
      title: '404 Not Found',
      errorMessage: 'Project does not exist',
    });
  });

  it('should return title, message, and stack for Error input', () => {
    const error = new Error('boom');
    error.name = 'TypeError';

    const result = getRouteErrorDetails(error);

    expect(result).toEqual({
      title: 'TypeError',
      errorMessage: 'boom',
      stack: error.stack,
    });
  });

  it('should return route error details for string input', () => {
    expect(getRouteErrorDetails('failed to render')).toEqual({
      title: 'Route error',
      errorMessage: 'failed to render',
    });
  });

  it('should return unknown route error fallback', () => {
    expect(getRouteErrorDetails({ some: 'object' })).toEqual({
      title: 'Route error',
      errorMessage: 'Unknown route error',
    });
  });
});
