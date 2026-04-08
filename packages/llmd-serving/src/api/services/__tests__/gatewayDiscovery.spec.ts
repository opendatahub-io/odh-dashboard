import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { getGatewayOptions, isGatewayOption } from '../gatewayDiscovery';

jest.mock('@odh-dashboard/internal/api/proxyUtils', () => ({
  proxyGET: jest.fn(),
}));

const mockProxyGET = jest.mocked(proxyGET);

describe('isGatewayOption', () => {
  it('should return true for a valid gateway option with required fields', () => {
    expect(isGatewayOption({ name: 'gw', namespace: 'ns' })).toBe(true);
  });

  it('should return true when optional fields are present', () => {
    expect(
      isGatewayOption({
        name: 'gw',
        namespace: 'ns',
        listener: 'https',
        status: 'Ready',
        displayName: 'My Gateway',
        description: 'desc',
      }),
    ).toBe(true);
  });

  it('should return false for null', () => {
    expect(isGatewayOption(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isGatewayOption(undefined)).toBe(false);
  });

  it('should return false for a non-object value', () => {
    expect(isGatewayOption('string')).toBe(false);
  });

  it('should return false when name is missing', () => {
    expect(isGatewayOption({ namespace: 'ns' })).toBe(false);
  });

  it('should return false when namespace is missing', () => {
    expect(isGatewayOption({ name: 'gw' })).toBe(false);
  });

  it('should return false when name is not a string', () => {
    expect(isGatewayOption({ name: 123, namespace: 'ns' })).toBe(false);
  });

  it('should return false when namespace is not a string', () => {
    expect(isGatewayOption({ name: 'gw', namespace: 456 })).toBe(false);
  });
});

describe('getGatewayOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with the correct arguments', async () => {
    mockProxyGET.mockResolvedValue({
      gateways: [{ name: 'gw-1', namespace: 'test-ns' }],
    });

    await getGatewayOptions('test-ns');

    expect(mockProxyGET).toHaveBeenCalledWith(
      '/api/service/model-serving',
      '/api/v1/gateways',
      { namespace: 'test-ns' },
      undefined,
    );
  });

  it('should return gateway options for a valid response', async () => {
    const gateways = [
      { name: 'gw-1', namespace: 'ns-1', listener: 'https', status: 'Ready' as const },
      { name: 'gw-2', namespace: 'ns-2' },
    ];
    mockProxyGET.mockResolvedValue({ gateways });

    const result = await getGatewayOptions('ns-1');

    expect(result).toEqual(gateways);
  });

  it('should throw when the response is a proxy error', async () => {
    mockProxyGET.mockResolvedValue({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'something went wrong',
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow('Gateway discovery failed.');
  });

  it('should throw when gateways is not an array', async () => {
    mockProxyGET.mockResolvedValue({ gateways: 'not-an-array' });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when gateways is missing from the response', async () => {
    mockProxyGET.mockResolvedValue({});

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when a gateway item fails type validation', async () => {
    mockProxyGET.mockResolvedValue({
      gateways: [{ name: 'valid', namespace: 'ns' }, { name: 123 }],
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when a gateway item is missing required fields', async () => {
    mockProxyGET.mockResolvedValue({
      gateways: [{ listener: 'https', status: 'Ready' }],
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should return an empty array when gateways is empty', async () => {
    mockProxyGET.mockResolvedValue({ gateways: [] });

    const result = await getGatewayOptions('ns');

    expect(result).toEqual([]);
  });

  it('should forward opts to proxyGET', async () => {
    mockProxyGET.mockResolvedValue({ gateways: [] });
    const opts = { signal: new AbortController().signal };

    await getGatewayOptions('ns', opts);

    expect(mockProxyGET).toHaveBeenCalledWith(
      '/api/service/model-serving',
      '/api/v1/gateways',
      { namespace: 'ns' },
      opts,
    );
  });
});
