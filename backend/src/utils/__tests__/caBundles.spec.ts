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
    rootCertificates: ['default-ca'],
  },
}));

const originalExtraCAPath = process.env.NODE_EXTRA_CA_CERTS;

beforeAll(() => {
  delete process.env.NODE_EXTRA_CA_CERTS;
});

afterEach(() => {
  delete process.env.NODE_EXTRA_CA_CERTS;
});

afterAll(() => {
  if (originalExtraCAPath !== undefined) {
    process.env.NODE_EXTRA_CA_CERTS = originalExtraCAPath;
  }
});

describe('readCABundles', () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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
      throw new Error('ENOENT');
    });

    expect(readCABundles(['/system-ca', '/missing-ca', '/service-ca'])).toEqual([
      systemCA,
      serviceCA,
    ]);
  });

  it('should return an empty array when no CA bundle can be read', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    expect(readCABundles(['/denied-ca'])).toEqual([]);
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
  it('should pass default and configured CA bundles to undici when bundles are available', () => {
    const ca = Buffer.from('service-ca');

    expect(getUndiciTLSOptions([ca])).toEqual({
      connect: { ca: [Buffer.from('default-ca'), ca] },
    });
  });

  it('should omit undici TLS options when no CA bundles are available', () => {
    expect(getUndiciTLSOptions([])).toBeUndefined();
  });
});

describe('getTrustedCAs', () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve Node default trust, including NODE_EXTRA_CA_CERTS', () => {
    const ca = Buffer.from('service-ca');
    process.env.NODE_EXTRA_CA_CERTS = '/extra-ca';
    mockReadFileSync.mockImplementation((path: string) =>
      path === '/extra-ca' ? Buffer.from('extra-ca') : Buffer.from('default-ca'),
    );

    expect(getTrustedCAs([ca])).toEqual([Buffer.from('default-ca'), Buffer.from('extra-ca'), ca]);
    expect(mockReadFileSync).toHaveBeenCalledWith('/extra-ca');
  });

  it('should return undefined when no configured CA bundles are available', () => {
    expect(getTrustedCAs([])).toBeUndefined();
  });
});
