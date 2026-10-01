// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- Verify the serving hub adapter used by the RHOAI host composition root.
import { gatewayDiscoveryServices } from '@odh-dashboard/model-serving/api/gatewayDiscovery';

describe('RHOAI gateway adapter', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('should call only the fixed gateway route and forward cancellation', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValue({ ok: true, json: async () => ({ gateways: [] }) } as Response);
    const { signal } = new AbortController();
    await expect(
      gatewayDiscoveryServices.discoverGateways?.('project-a', { signal }),
    ).resolves.toEqual({ gateways: [] });
    expect(fetch).toHaveBeenCalledWith(
      '/api/service/model-serving/api/v1/gateways?namespace=project-a',
      { method: 'GET', signal, credentials: 'same-origin' },
    );
  });

  it('should reject upstream errors', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(gatewayDiscoveryServices.discoverGateways?.('project-a')).rejects.toThrow('403');
  });
});
