import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import type { Deployment } from '../../../../extension-points';
import { useDeploymentAuthTokens } from '../../../concepts/auth';
import { useResolvedDeploymentExtension } from '../../../concepts/extensionUtils';
import {
  useExtractFormDataFromDeployment,
  UseExtractFormDataFromDeploymentReturn,
} from '../useExtractFormDataFromDeployment';
import { useWizardFieldExtractors } from '../useWizardFieldExtractors';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useDashboardNamespace: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
  NotReadyError: class NotReadyError extends Error {},
}));
jest.mock('../../../concepts/extensionUtils');
jest.mock('../../../concepts/auth');
jest.mock('../useWizardFieldExtractors');

const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);
const mockUseFetch = jest.mocked(useFetch);
const mockUseResolvedDeploymentExtension = jest.mocked(useResolvedDeploymentExtension);
const mockUseDeploymentAuthTokens = jest.mocked(useDeploymentAuthTokens);
const mockUseWizardFieldExtractors = jest.mocked(useWizardFieldExtractors);

const mockDeployment: Deployment = {
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'llmd.ai/v1alpha1',
    kind: 'LLMInferenceService',
    metadata: { name: 'test-model', namespace: 'test-ns' },
    spec: { model: { uri: 'hf://test/model' } },
  },
} as unknown as Deployment;

describe('useExtractFormDataFromDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'test-ns' });
    mockUseFetch.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
    } as unknown as ReturnType<typeof useFetch<never>>);
    mockUseResolvedDeploymentExtension.mockReturnValue([
      {
        properties: {
          extractHardwareProfileConfig: () => ({ data: undefined }),
          extractReplicas: () => ({ data: undefined }),
          extractModelLocationData: () => undefined,
          extractRuntimeArgs: () => undefined,
          extractEnvironmentVariables: () => undefined,
          extractModelAvailabilityData: () => undefined,
          extractModelServerTemplate: () => undefined,
        },
      },
      true,
      [],
    ] as unknown as ReturnType<typeof useResolvedDeploymentExtension>);
    mockUseDeploymentAuthTokens.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
    } as unknown as ReturnType<typeof useDeploymentAuthTokens>);
    mockUseWizardFieldExtractors.mockReturnValue({
      extractedFieldData: {},
      extractorsLoaded: true,
      extractorErrors: [],
    } as unknown as ReturnType<typeof useWizardFieldExtractors>);
  });

  it('should report loaded with no errors when there is no deployment', () => {
    const renderResult = testHook(useExtractFormDataFromDeployment)(undefined);
    expect(renderResult).hookToStrictEqual({
      formData: undefined,
      loaded: true,
      errors: [],
    } satisfies UseExtractFormDataFromDeploymentReturn);
  });

  it('should report not loaded while deployment data is still fetching', () => {
    mockUseDeploymentAuthTokens.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
    } as unknown as ReturnType<typeof useDeploymentAuthTokens>);

    const renderResult = testHook(useExtractFormDataFromDeployment)(mockDeployment);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.formData).toBeUndefined();
    expect(renderResult.result.current.errors).toStrictEqual([]);
  });

  it('should report settled (loaded) when a fetch fails terminally, so consumers are not stuck pending', () => {
    mockUseDeploymentAuthTokens.mockReturnValue({
      data: [],
      loaded: false,
      error: new Error('failed to load deployment secrets'),
    } as unknown as ReturnType<typeof useDeploymentAuthTokens>);

    const renderResult = testHook(useExtractFormDataFromDeployment)(mockDeployment);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.formData).toBeUndefined();
    expect(renderResult.result.current.errors?.[0]?.message).toBe(
      'failed to load deployment secrets',
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should report loaded with extracted form data on success', () => {
    const renderResult = testHook(useExtractFormDataFromDeployment)(mockDeployment);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.errors).toStrictEqual([]);
    expect(renderResult.result.current.formData).toBeDefined();
  });
});
