import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from '@testing-library/react';
import { ProjectKind } from '~/k8sTypes';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import useModelServingProjects from '~/pages/modelServing/useModelServingProjects';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_MODEL_SERVING_PROJECT } from '~/const';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = k8sListResource as jest.Mock;

describe('useModelServingProjects', () => {
  it('should return model serving projects when namespace is not provided', async () => {
    const mockModelServingProjects = {
      items: [{ metadata: { name: 'item 1' } }, { metadata: { name: 'item 2' } }] as ProjectKind[],
    };
    const label = `${LABEL_SELECTOR_DASHBOARD_RESOURCE},${LABEL_SELECTOR_MODEL_SERVING_PROJECT}`;
    const options = {
      model: {
        apiVersion: 'v1',
        apiGroup: 'project.openshift.io',
        kind: 'Project',
        plural: 'projects',
      },
      queryOptions: label ? { queryParams: { labelSelector: label } } : undefined,
    };
    k8sListResourceMock.mockReturnValue(Promise.resolve(mockModelServingProjects));

    const renderResult = testHook(useModelServingProjects)();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith(options);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockModelServingProjects.items, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockReturnValue(
      Promise.resolve({ items: [...mockModelServingProjects.items] }),
    );
    await act(() => {
      renderResult.result.current[3]();
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle when namespace is provided', async () => {
    const renderResult = testHook(useModelServingProjects)('namespace');
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockReturnValue(Promise.reject(new Error('error1')));

    const renderResult = testHook(useModelServingProjects)();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    k8sListResourceMock.mockReturnValue(Promise.reject(new Error('error2')));
    await act(() => {
      renderResult.result.current[3]();
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
