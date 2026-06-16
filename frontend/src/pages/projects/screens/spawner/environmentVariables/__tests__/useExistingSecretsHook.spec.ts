import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockK8sResourceList } from '#~/__mocks__';
import { KnownLabels } from '#~/k8sTypes';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when namespace is undefined', () => {
    const renderResult = testHook(useExistingSecrets)(undefined);
    expect(renderResult.result.current[0]).toEqual([]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch and return only non-connection non-dashboard Opaque secrets', async () => {
    const externalSecret = mockCustomSecretK8sResource({
      name: 'external-secret',
      namespace: 'ns',
      data: { DB_HOST: 'aG9zdA==', DB_PORT: 'NTQzMg==' },
      type: 'Opaque',
    });
    delete externalSecret.metadata.labels;

    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([
        externalSecret,
        mockCustomSecretK8sResource({
          name: 'connection-secret',
          namespace: 'ns',
          data: { ENDPOINT: 'dXJs' },
          type: 'Opaque',
          annotations: { 'opendatahub.io/connection-type-ref': 's3' },
        }),
        mockCustomSecretK8sResource({
          name: 'dashboard-secret',
          namespace: 'ns',
          data: { KEY: 'dmFs' },
          type: 'Opaque',
          labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
        }),
        mockCustomSecretK8sResource({
          name: 'sa-token',
          namespace: 'ns',
          data: { token: 'dG9r' },
          type: 'kubernetes.io/service-account-token',
        }),
      ]),
    );

    const renderResult = testHook(useExistingSecrets)('ns');
    await renderResult.waitForNextUpdate();

    const [secrets, loaded] = renderResult.result.current;
    expect(loaded).toBe(true);
    expect(secrets).toHaveLength(1);
    expect(secrets[0].name).toBe('external-secret');
    expect(secrets[0].keys).toEqual(['DB_HOST', 'DB_PORT']);
  });

  it('should strip secret values and return only key names', async () => {
    const s = mockCustomSecretK8sResource({
      name: 'my-secret',
      namespace: 'ns',
      data: { PASSWORD: 'c2VjcmV0', TOKEN: 'dG9rZW4=' },
      type: 'Opaque',
    });
    delete s.metadata.labels;
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([s]));

    const renderResult = testHook(useExistingSecrets)('ns');
    await renderResult.waitForNextUpdate();

    const [secrets] = renderResult.result.current;
    expect(secrets[0].keys).toEqual(['PASSWORD', 'TOKEN']);
    expect(secrets[0]).not.toHaveProperty('data');
  });

  it('should handle secrets with no data field', async () => {
    const secret = mockCustomSecretK8sResource({
      name: 'empty-secret',
      namespace: 'ns',
      data: {},
      type: 'Opaque',
    });
    delete secret.metadata.labels;
    delete (secret as Record<string, unknown>).data;

    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([secret]));

    const renderResult = testHook(useExistingSecrets)('ns');
    await renderResult.waitForNextUpdate();

    const [secrets] = renderResult.result.current;
    expect(secrets[0].keys).toEqual([]);
  });
});
