import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { useCreateExternalProviderForm } from '~/app/pages/external-providers/createProvider/useCreateExternalProviderForm';
import { useCreateExternalProvider } from '~/app/hooks/useCreateExternalProvider';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

jest.mock('@odh-dashboard/ui-core/components/K8sNameDescriptionField', () => ({
  useK8sNameDescriptionFieldData: jest.fn(),
}));
jest.mock('~/app/context/ExternalModelsContext', () => ({
  useExternalModelsContext: () => ({ secrets: [], secretsLoaded: true, refreshSecrets: jest.fn() }),
}));
jest.mock('~/app/hooks/useCreateExternalProvider');
jest.mock('~/app/hooks/useCreateSecret', () => ({
  useCreateSecret: () => ({ isCreating: false, createSecretCallback: jest.fn() }),
}));

const validFormData = {
  provider: 'openai',
  endpointUrl: 'api.openai.com',
  authMechanism: 'apikey',
  credentialSecretRef: 'credential-secret',
  isNewSecret: false,
  secretValue: '',
} as const;

const renderForm = (createExternalProviderCallback: jest.Mock) => {
  jest.mocked(useCreateExternalProvider).mockReturnValue({
    isCreating: false,
    createExternalProviderCallback,
  } as unknown as ReturnType<typeof useCreateExternalProvider>);
  jest.mocked(useK8sNameDescriptionFieldData).mockReturnValue({
    data: {
      name: 'My provider',
      description: 'desc',
      k8sName: {
        value: 'my-provider',
        state: {
          invalidCharacters: false,
          invalidLength: false,
          routeNameTooLong: false,
          immutable: false,
        },
      },
    },
    onDataChange: jest.fn(),
  } as unknown as ReturnType<typeof useK8sNameDescriptionFieldData>);

  const trackEvent = jest.fn();
  const renderResult = renderHook(() => useCreateExternalProviderForm('test-ns'), {
    wrapper: ({ children }) => (
      <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
    ),
  });
  act(() => {
    renderResult.result.current.setFormData(validFormData);
  });
  return { renderResult, trackEvent };
};

describe('useCreateExternalProviderForm tracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emits the added success event through the injected callback', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);
    const { renderResult, trackEvent } = renderForm(callback);

    let created: string | undefined;
    await act(async () => {
      created = await renderResult.result.current.submit();
    });

    expect(created).toBe('my-provider');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('External Provider Added', {
      outcome: 'submit',
      success: true,
      providerType: 'openai',
      authMechanism: 'apikey',
      hasCreatedSecret: false,
      hasDescription: true,
      countOfConfigPairs: 0,
    });
  });

  it('emits the added failure event and keeps the error out of the payload', async () => {
    const message = 'Private provider diagnostic';
    const callback = jest.fn().mockRejectedValue(new Error(message));
    const { renderResult, trackEvent } = renderForm(callback);

    let created: string | undefined;
    await act(async () => {
      created = await renderResult.result.current.submit();
    });

    expect(created).toBeUndefined();
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      'External Provider Added',
      expect.objectContaining({ outcome: 'submit', success: false }),
    );
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain(message);
  });
});
