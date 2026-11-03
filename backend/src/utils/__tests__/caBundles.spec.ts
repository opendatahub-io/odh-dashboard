import fs from 'fs';
import { CA_BUNDLE_PATHS, getTrustedCAs, getUndiciTLSOptions, readCABundles } from '../caBundles';

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    readFileSync: jest.fn(() => Buffer.from('default-ca')),
  },
}));

jest.mock('tls', () => ({
  __esModule: true,
  default: {
    getCACertificates: jest.fn(() => ['system-ca', 'extra-ca']),
    rootCertificates: ['default-ca'],
  },
}));

describe('readCABundles', () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should read all available CA bundles and skip missing paths', () => {
    const systemCA = Buffer.from('system-ca');
    const serviceCA = Buffer.from('service-ca');
    mockReadFileSync.mockImplementation((path: string) => {
      if (path === '/system-ca') {
        return systemCA;
      }
      if (path === '/service-ca') {
        return serviceCA;
      }
      throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
    });

    expect(readCABundles(['/system-ca', '/missing-ca', '/service-ca'])).toEqual([
      systemCA,
      serviceCA,
    ]);
  });

  it('should warn and return an empty array when a CA bundle cannot be read', () => {
    const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    mockReadFileSync.mockImplementation(() => {
      throw error;
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(readCABundles(['/denied-ca'])).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Unable to read CA bundle /denied-ca: EACCES: permission denied',
    );
  });

  it('should return an empty array when no paths are provided', () => {
    expect(readCABundles([])).toEqual([]);
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('should read every configured CA bundle path by default', () => {
    mockReadFileSync.mockImplementation(() => Buffer.from('ca'));

    expect(readCABundles()).toHaveLength(CA_BUNDLE_PATHS.length);
    expect(mockReadFileSync.mock.calls.map(([path]) => path)).toEqual(CA_BUNDLE_PATHS);
  });
});

describe('getUndiciTLSOptions', () => {
  it('should wrap the default trusted CAs in undici options', () => {
    expect(getUndiciTLSOptions()).toEqual({ connect: { ca: getTrustedCAs() } });
  });

  it('should reuse the default undici TLS options', () => {
    expect(getUndiciTLSOptions()).toBe(getUndiciTLSOptions());
  });
});

describe('getTrustedCAs', () => {
  it('should preserve Node effective default trust, including system and NODE_EXTRA_CA_CERTS', () => {
    const ca = Buffer.from('service-ca');

    expect(getTrustedCAs([ca])).toEqual([Buffer.from('system-ca'), Buffer.from('extra-ca'), ca]);
  });

  it('should return undefined when no configured CA bundles are available', () => {
    expect(getTrustedCAs([])).toBeUndefined();
  });
});
