import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import useModelRegistryCertificateNames from '#~/concepts/modelRegistrySettings/useModelRegistryCertificateNames';
import { listModelRegistryCertificateNames } from '#~/services/modelRegistrySettingsService';
import { ListConfigSecretsResponse } from '#~/k8sTypes';

jest.mock('#~/services/modelRegistrySettingsService', () => ({
  listModelRegistryCertificateNames: jest.fn(),
}));

const mockListModelRegistryCertificateNames = jest.mocked(listModelRegistryCertificateNames);

describe('useModelRegistryCertificateNames', () => {
  it('should return config maps and secrets when isDisabled is false', async () => {
    const mockConfigMapsSecrets: ListConfigSecretsResponse = {
      configMaps: [{ name: 'foo-bar', keys: ['bar.crt'] }],
      secrets: [{ name: 'foo', keys: ['foo.crt', 'bar.crt'] }],
    };
    mockListModelRegistryCertificateNames.mockResolvedValue(mockConfigMapsSecrets);
    const renderResult = testHook(useModelRegistryCertificateNames)(false);
    expect(mockListModelRegistryCertificateNames).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        {
          configMaps: [],
          secrets: [],
        },
        false,
        undefined,
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockListModelRegistryCertificateNames).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockConfigMapsSecrets, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    await act(() => renderResult.result.current[3]());
    expect(mockListModelRegistryCertificateNames).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });
  it('should handle errors', async () => {
    mockListModelRegistryCertificateNames.mockRejectedValue(
      new Error('Model registry certificate names is disabled'),
    );

    const renderResult = testHook(useModelRegistryCertificateNames)(false);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        {
          configMaps: [],
          secrets: [],
        },
        false,
        undefined,
      ),
    );
    await renderResult.waitForNextUpdate();
    expect(mockListModelRegistryCertificateNames).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        {
          configMaps: [],
          secrets: [],
        },
        false,
        new Error('Model registry certificate names is disabled'),
      ),
    );
  });
});
