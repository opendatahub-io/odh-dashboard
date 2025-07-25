import { testHook } from '@odh-dashboard/jest-config/hooks';
import { getIntegrationAppEnablementStatus } from '#~/services/integrationAppService';
import { OdhApplication, VariablesValidationStatus } from '#~/types';
import * as reduxHooks from '#~/redux/hooks';
import { useWatchIntegrationComponents } from '#~/utilities/useWatchIntegrationComponents';

jest.mock('#~/services/integrationAppService', () => ({
  getIntegrationAppEnablementStatus: jest.fn(),
}));

jest.mock('#~/redux/hooks', () => ({
  useAppSelector: jest.fn().mockReturnValue(0),
}));

const mockGetIntegrationAppEnablementStatus = getIntegrationAppEnablementStatus as jest.Mock;
const mockUseAppSelector = jest.spyOn(reduxHooks, 'useAppSelector');

describe('useWatchIntegrationComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockReturnValue(0);
  });

  const mockApp: OdhApplication = {
    metadata: { name: 'test-app' },
    spec: {
      displayName: 'Test App',
      provider: 'Test Provider',
      description: 'Test Description',
      img: 'test-img',
      docsLink: 'test-docs',
      getStartedLink: 'test-started',
      getStartedMarkDown: 'test-markdown',
      internalRoute: '/api/test',
      isEnabled: false,
      quickStart: null,
      shownOnEnabledPage: null,
      route: null,
      routeNamespace: null,
      routeSuffix: null,
      serviceName: null,
      endpoint: null,
      link: null,
    },
  };

  it('should return empty array when no components provided', () => {
    const renderResult = testHook(useWatchIntegrationComponents)();
    expect(renderResult.result.current.checkedComponents).toEqual([]);
    expect(renderResult.result.current.isIntegrationComponentsChecked).toBe(false);
  });

  it('should return original components when no integration components', () => {
    const components = [{ ...mockApp, spec: { ...mockApp.spec, internalRoute: undefined } }];
    const renderResult = testHook(useWatchIntegrationComponents)(components);
    expect(renderResult.result.current.checkedComponents).toEqual(components);
    expect(renderResult.result.current.isIntegrationComponentsChecked).toBe(true);
  });

  it('should update component status when integration app is enabled', async () => {
    mockGetIntegrationAppEnablementStatus.mockResolvedValue({
      isInstalled: true,
      isEnabled: true,
      canInstall: true,
      variablesValidationStatus: VariablesValidationStatus.SUCCESS,
      error: '',
    });

    const renderResult = testHook(useWatchIntegrationComponents)([mockApp]);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.checkedComponents[0].spec.isEnabled).toBe(true);
    expect(renderResult.result.current.isIntegrationComponentsChecked).toBe(true);
  });

  it('should handle error response', async () => {
    const errorMessage = 'Test error';
    mockGetIntegrationAppEnablementStatus.mockResolvedValue({
      isInstalled: false,
      isEnabled: false,
      canInstall: false,
      variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
      error: errorMessage,
    });

    const renderResult = testHook(useWatchIntegrationComponents)([mockApp]);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.checkedComponents[0].spec.isEnabled).toBe(false);
    expect(renderResult.result.current.checkedComponents[0].spec.error).toBe(errorMessage);
    expect(renderResult.result.current.isIntegrationComponentsChecked).toBe(true);
  });

  it('should update on forceComponentsUpdate', async () => {
    const renderResult = testHook(useWatchIntegrationComponents)([mockApp]);
    await renderResult.waitForNextUpdate();

    mockUseAppSelector.mockReturnValue(1);

    mockGetIntegrationAppEnablementStatus.mockResolvedValue({
      isInstalled: true,
      isEnabled: true,
      canInstall: true,
      variablesValidationStatus: VariablesValidationStatus.SUCCESS,
      error: '',
    });

    renderResult.rerender([mockApp]);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.checkedComponents[0].spec.isEnabled).toBe(true);
  });
});
