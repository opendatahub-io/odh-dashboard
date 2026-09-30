import { getNIMResource, getNIMData } from '#~/pages/modelServing/screens/projects/nim/nimUtils';

jest.mock('#~/pages/modelServing/screens/projects/utils', () => ({
  fetchInferenceServiceCount: jest.fn(),
}));
jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({ deleteSecret: jest.fn() }));
jest.mock('#~/api', () => ({}));

describe('legacy NIM credential requests', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        body: {
          data: Object.fromEntries([
            ['api_key', 'test-key'],
            ['.dockerconfigjson', 'test-pull'],
          ]),
        },
      }),
    });
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(['apiKeySecret', 'nimPullSecret'] as const)(
    'should send the project for %s',
    async (resource) => {
      await getNIMResource(resource, 'my-project');
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/nim-serving/${resource}?namespace=my-project`,
        expect.anything(),
      );
    },
  );

  it('should keep catalog requests unscoped', async () => {
    await getNIMResource('nimConfig');
    expect(fetchMock).toHaveBeenCalledWith('/api/nim-serving/nimConfig', expect.anything());
  });

  it.each(['', ' '])('should reject an empty project without fetching', async (namespace) => {
    await expect(getNIMResource('apiKeySecret', namespace)).rejects.toThrow('target project');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should preserve credential transformations', async () => {
    await expect(getNIMData('apiKeySecret', false, 'my-project')).resolves.toEqual({
      NGC_API_KEY: 'test-key',
    });
    await expect(getNIMData('nimPullSecret', true, 'my-project')).resolves.toEqual({
      '.dockerconfigjson': 'test-pull',
    });
  });

  it('should preserve a denied response in the error', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Forbidden' });
    await expect(getNIMResource('apiKeySecret', 'my-project')).rejects.toThrow('Forbidden');
  });
});
