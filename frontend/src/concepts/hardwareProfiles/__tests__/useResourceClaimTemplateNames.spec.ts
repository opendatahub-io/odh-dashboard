import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sStatusError, type ResourceClaimTemplateKind } from '@odh-dashboard/k8s-core';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useK8sWatchResourceListMock = jest.mocked(
  useK8sWatchResourceList<ResourceClaimTemplateKind[]>,
);

describe('useResourceClaimTemplateNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should watch the ResourceClaimTemplates of the namespace', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], false, undefined]);

    testHook(useResourceClaimTemplateNames)('test-project');

    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(ResourceClaimTemplateModel),
        namespace: 'test-project',
      },
      ResourceClaimTemplateModel,
    );
  });

  it('should not watch and be unavailable without a namespace', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useResourceClaimTemplateNames)(undefined);

    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(null, ResourceClaimTemplateModel);
    expect(renderResult).hookToStrictEqual({ status: 'unavailable' });
  });

  it('should be loading while the templates are loading', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({ status: 'loading' });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return the names of the loaded templates', () => {
    useK8sWatchResourceListMock.mockReturnValue([
      [
        mockResourceClaimTemplate({ name: 'single-gpu' }),
        mockResourceClaimTemplate({ name: 'single-mig-partition' }),
      ],
      true,
      undefined,
    ]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({
      status: 'ready',
      names: new Set(['single-gpu', 'single-mig-partition']),
    });
  });

  it('should return no names when the namespace has no templates', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({ status: 'ready', names: new Set() });
  });

  it('should be unavailable when the user cannot list the templates', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], false, new K8sStatusError(mock403Error({}))]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({ status: 'unavailable' });
  });

  it('should be unavailable when the templates API is not served', () => {
    useK8sWatchResourceListMock.mockReturnValue([[], false, new K8sStatusError(mock404Error({}))]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({ status: 'unavailable' });
  });

  it('should be unavailable when a reload fails after the templates loaded', () => {
    useK8sWatchResourceListMock.mockReturnValue([
      [mockResourceClaimTemplate({ name: 'single-gpu' })],
      true,
      new Error('Network error'),
    ]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');

    expect(renderResult).hookToStrictEqual({ status: 'unavailable' });
  });

  it('should return a stable result when rerendered with the same templates', () => {
    useK8sWatchResourceListMock.mockReturnValue([
      [mockResourceClaimTemplate({ name: 'single-gpu' })],
      true,
      undefined,
    ]);

    const renderResult = testHook(useResourceClaimTemplateNames)('test-project');
    renderResult.rerender('test-project');

    expect(renderResult).hookToBeStable();
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
