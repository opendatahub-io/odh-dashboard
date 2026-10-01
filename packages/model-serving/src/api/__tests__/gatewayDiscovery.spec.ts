import { getGatewayOptions, isGatewayOption } from '../gatewayDiscovery';

describe('gateway discovery', () => {
  it('should preserve gateway metadata and request cancellation', async () => {
    const gateways = [
      {
        name: 'gw',
        namespace: 'infra',
        listener: 'https',
        status: 'Ready',
        displayName: 'Shared gateway',
        description: 'External traffic',
      },
    ];
    const discoverGateways = jest.fn().mockResolvedValue({ gateways });
    const opts = { signal: new AbortController().signal };
    await expect(getGatewayOptions({ discoverGateways }, 'project-a', opts)).resolves.toEqual(
      gateways,
    );
    expect(discoverGateways).toHaveBeenCalledWith('project-a', opts);
  });

  it.each([
    null,
    undefined,
    'invalid',
    {},
    { gateways: null },
    { gateways: [{}] },
    { gateways: [{ name: 'gw', namespace: 'ns', status: 'unexpected' }] },
    { gateways: [{ name: 'gw', namespace: 'ns', listener: 12 }] },
    { gateways: [{ name: 'gw', namespace: 'ns', displayName: false }] },
    { gateways: [{ name: 'gw', namespace: 'ns', description: {} }] },
  ])('should reject malformed payload %p', async (payload) => {
    await expect(
      getGatewayOptions({ discoverGateways: async () => payload }, 'project-a'),
    ).rejects.toThrow('Invalid response');
  });

  it.each(['', '../services', 'ns&path=/secrets', 'https://other.example'])(
    'should reject invalid namespace %s before calling the host',
    async (namespace) => {
      const discoverGateways = jest.fn();
      await expect(getGatewayOptions({ discoverGateways }, namespace)).rejects.toThrow('namespace');
      expect(discoverGateways).not.toHaveBeenCalled();
    },
  );

  it('should report an unsupported host without calling a transport', async () => {
    await expect(getGatewayOptions({}, 'project-a')).rejects.toThrow('not available');
  });

  it('should propagate cancellation', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    await expect(
      getGatewayOptions(
        {
          discoverGateways: async () => {
            throw error;
          },
        },
        'project-a',
      ),
    ).rejects.toBe(error);
  });

  it('should accept gateway references and an empty discovery result', async () => {
    expect(isGatewayOption({ name: 'gw', namespace: 'ns' })).toBe(true);
    expect(isGatewayOption({ name: '', namespace: 'ns' })).toBe(false);
    await expect(
      getGatewayOptions({ discoverGateways: async () => ({ gateways: [] }) }, 'project-a'),
    ).resolves.toEqual([]);
  });
});
