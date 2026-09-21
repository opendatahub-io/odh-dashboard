import {
  fireTrackingEvent,
  firePageEvent,
  fireIdentifyEvent,
  computeAnonymousUserId,
} from '../segmentUtils';

const mockTrack = jest.fn();
const mockPage = jest.fn();
const mockIdentify = jest.fn();

describe('fireTrackingEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  it('should call window.analytics.track in production mode', () => {
    window.analytics = { track: mockTrack } as never;
    fireTrackingEvent('test-event', { key: 'value' } as never, {
      clusterID: 'cluster-1',
      devMode: false,
      version: '1.0.0',
    });
    expect(mockTrack).toHaveBeenCalledWith(
      'test-event',
      { key: 'value', clusterID: 'cluster-1' },
      { app: { version: '1.0.0' } },
    );
  });

  it('should log to console in dev mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    fireTrackingEvent(
      'test-event',
      {},
      {
        clusterID: 'cluster-1',
        devMode: true,
        version: '1.0.0',
      },
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Telemetry event triggered: test-event'),
    );
    consoleSpy.mockRestore();
  });

  it('should not call track if analytics is not initialized', () => {
    fireTrackingEvent(
      'test-event',
      {},
      {
        clusterID: 'cluster-1',
        devMode: false,
        version: '1.0.0',
      },
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('should alert on page or identify events in dev mode', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
    fireTrackingEvent(
      'page',
      {},
      {
        clusterID: 'cluster-1',
        devMode: true,
        version: '1.0.0',
      },
    );
    expect(alertSpy).toHaveBeenCalledWith('Got a page or identify event. Must not happen');
    alertSpy.mockRestore();
  });
});

describe('firePageEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  it('should call window.analytics.page in production mode', () => {
    window.analytics = { page: mockPage } as never;
    firePageEvent({
      clusterID: 'cluster-1',
      devMode: false,
      version: '1.0.0',
    });
    expect(mockPage).toHaveBeenCalledWith(
      undefined,
      { clusterID: 'cluster-1' },
      { app: { version: '1.0.0' } },
    );
  });

  it('should log to console in dev mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    firePageEvent({
      clusterID: 'cluster-1',
      devMode: true,
      version: '1.0.0',
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page event triggered'));
    consoleSpy.mockRestore();
  });

  it('should not call page if analytics is not initialized', () => {
    firePageEvent({
      clusterID: 'cluster-1',
      devMode: false,
      version: '1.0.0',
    });
    expect(mockPage).not.toHaveBeenCalled();
  });
});

describe('fireIdentifyEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  it('should call window.analytics.identify in production mode', () => {
    window.analytics = { identify: mockIdentify } as never;
    fireIdentifyEvent(
      { isAdmin: true, canCreateProjects: false, userID: 'user-123' },
      { clusterID: 'cluster-1', devMode: false },
    );
    expect(mockIdentify).toHaveBeenCalledWith('user-123', {
      clusterID: 'cluster-1',
      isAdmin: true,
      canCreateProjects: false,
    });
  });

  it('should log to console in dev mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    fireIdentifyEvent(
      { isAdmin: false, canCreateProjects: true, userID: 'user-456' },
      { clusterID: 'cluster-1', devMode: true },
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Identify event triggered'));
    consoleSpy.mockRestore();
  });

  it('should not call identify if analytics is not initialized', () => {
    fireIdentifyEvent(
      { isAdmin: false, canCreateProjects: false },
      { clusterID: 'cluster-1', devMode: false },
    );
    expect(mockIdentify).not.toHaveBeenCalled();
  });
});

describe('computeAnonymousUserId', () => {
  const mockDigest = jest.fn();

  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: mockDigest,
        },
      },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a hex string from SHA-1 hash', async () => {
    const fakeHash = new Uint8Array([0x0a, 0x1b, 0x2c, 0xff]).buffer;
    mockDigest.mockResolvedValue(fakeHash);

    const result = await computeAnonymousUserId('testuser');

    expect(mockDigest).toHaveBeenCalledWith('SHA-1', new TextEncoder().encode('testuser'));
    expect(result).toBe('0a1b2cff');
  });

  it('should return consistent results for the same input', async () => {
    const fakeHash = new Uint8Array([0xab, 0xcd]).buffer;
    mockDigest.mockResolvedValue(fakeHash);

    const result1 = await computeAnonymousUserId('user@example.com');
    const result2 = await computeAnonymousUserId('user@example.com');
    expect(result1).toBe(result2);
  });

  it('should pad single-digit hex values with leading zero', async () => {
    const fakeHash = new Uint8Array([0x00, 0x01, 0x0f]).buffer;
    mockDigest.mockResolvedValue(fakeHash);

    const result = await computeAnonymousUserId('user');
    expect(result).toBe('00010f');
  });
});
