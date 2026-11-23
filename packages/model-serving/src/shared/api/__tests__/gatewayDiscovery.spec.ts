import { getGatewayOptions, isGatewayOption } from '../gatewayDiscovery';

const originalFetch = global.fetch;
const mockBody = jest.fn();
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => ({ ok: true, json: mockBody }));
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe('isGatewayOption', () => {
  it.each([
    { name: '', namespace: 'ns' },
    { name: 'gw', namespace: ' ' },
    { name: 'gw', namespace: 'ns', listener: 123 },
    { name: 'gw', namespace: 'ns', displayName: false },
    { name: 'gw', namespace: 'ns', description: [] },
    { name: 'gw', namespace: 'ns', status: 'Invalid' },
    { name: 'gw', namespace: 'ns', status: ['Ready'] },
  ])('should reject malformed gateway fields: %p', (value) => {
    expect(isGatewayOption(value)).toBe(false);
  });
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

  it.each([403, 404, 502, 503])('should reject HTTP failures (%s)', async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status });
    await expect(getGatewayOptions('ns')).rejects.toThrow('Gateway discovery failed.');
    expect(mockBody).not.toHaveBeenCalled();
  });

  it.each([null, undefined, [], 'not an object'])(
    'should reject invalid payloads: %p',
    async (body) => {
      mockBody.mockResolvedValue(body);
      await expect(getGatewayOptions('ns')).rejects.toThrow(
        'Invalid response from gateway discovery API.',
      );
    },
  );

  it('should preserve cancellation while reading the response', async () => {
    const error = new DOMException('Cancelled', 'AbortError');
    mockBody.mockRejectedValueOnce(error);
    await expect(getGatewayOptions('ns')).rejects.toBe(error);
  });

  it('should reject malformed JSON', async () => {
    mockBody.mockRejectedValueOnce(new SyntaxError('Invalid JSON'));
    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should require a namespace before requesting discovery', async () => {
    await expect(getGatewayOptions(' ')).rejects.toThrow('Namespace is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should call the fixed gateway endpoint with the selected namespace', async () => {
    mockBody.mockResolvedValue({
      gateways: [{ name: 'gw-1', namespace: 'test-ns' }],
    });

    await getGatewayOptions('test-ns');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/service/model-serving/api/v1/gateways?namespace=test-ns',
      { method: 'GET' },
    );
  });

  it('should return gateway options for a valid response', async () => {
    const gateways = [
      { name: 'gw-1', namespace: 'ns-1', listener: 'https', status: 'Ready' as const },
      { name: 'gw-2', namespace: 'ns-2' },
    ];
    mockBody.mockResolvedValue({ gateways });

    const result = await getGatewayOptions('ns-1');

    expect(result).toEqual(gateways);
  });

  it('should throw when the response is a proxy error', async () => {
    mockBody.mockResolvedValue({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'something went wrong',
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow('Gateway discovery failed.');
  });

  it('should throw when gateways is not an array', async () => {
    mockBody.mockResolvedValue({ gateways: 'not-an-array' });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when gateways is missing from the response', async () => {
    mockBody.mockResolvedValue({});

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when a gateway item fails type validation', async () => {
    mockBody.mockResolvedValue({
      gateways: [{ name: 'valid', namespace: 'ns' }, { name: 123 }],
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should throw when a gateway item is missing required fields', async () => {
    mockBody.mockResolvedValue({
      gateways: [{ listener: 'https', status: 'Ready' }],
    });

    await expect(getGatewayOptions('ns')).rejects.toThrow(
      'Invalid response from gateway discovery API.',
    );
  });

  it('should return an empty array when gateways is empty', async () => {
    mockBody.mockResolvedValue({ gateways: [] });

    const result = await getGatewayOptions('ns');

    expect(result).toEqual([]);
  });

  it('should forward cancellation to fetch', async () => {
    mockBody.mockResolvedValue({ gateways: [] });
    const opts = { signal: new AbortController().signal };

    await getGatewayOptions('ns', opts);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/service/model-serving/api/v1/gateways?namespace=ns',
      { method: 'GET', signal: opts.signal },
    );
  });
});
