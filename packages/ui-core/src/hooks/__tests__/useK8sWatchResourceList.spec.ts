import {
  type K8sResourceCommon,
  type WatchK8sResource,
  useK8sWatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '../useK8sWatchResourceList';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(),
}));

const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
const resource: WatchK8sResource = {
  groupVersionKind: { version: 'v1', kind: 'Pod' },
  namespace: 'opendatahub',
};

describe('useK8sWatchResourceList', () => {
  beforeEach(() => {
    useK8sWatchResourceMock.mockReset();
  });

  it('forces list semantics and preserves returned data', () => {
    const pods: K8sResourceCommon[] = [
      { apiVersion: 'v1', kind: 'Pod', metadata: { name: 'pod' } },
    ];
    useK8sWatchResourceMock.mockReturnValue([pods, true, undefined]);

    const renderResult = testHook(useK8sWatchResourceList)(resource);

    expect(useK8sWatchResourceMock).toHaveBeenCalledWith(
      { ...resource, isList: true },
      undefined,
      undefined,
    );
    expect(renderResult.result.current).toStrictEqual([pods, true, undefined]);
  });

  it('returns a stable empty list when the SDK has no data', () => {
    useK8sWatchResourceMock.mockReturnValue([undefined, false, undefined]);

    const renderResult = testHook(useK8sWatchResourceList)(null);
    const initialData = renderResult.result.current[0];
    renderResult.rerender(null);

    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
    expect(renderResult.result.current[0]).toBe(initialData);
  });

  it('preserves Error instances and converts Kubernetes status errors', () => {
    const error = new Error('watch failed');
    useK8sWatchResourceMock.mockReturnValue([[], false, error]);
    const errorResult = testHook(useK8sWatchResourceList)(resource);
    expect(errorResult.result.current[2]).toBe(error);

    const status = mock403Error({});
    useK8sWatchResourceMock.mockReturnValue([[], false, status]);
    const statusResult = testHook(useK8sWatchResourceList)(resource);
    expect(statusResult.result.current[2]).toBeInstanceOf(K8sStatusError);
    expect((statusResult.result.current[2] as K8sStatusError).statusObject).toBe(status);
  });

  it('normalizes unknown truthy errors', () => {
    useK8sWatchResourceMock.mockReturnValue([[], false, 'unexpected']);

    const renderResult = testHook(useK8sWatchResourceList)(resource);

    expect(renderResult.result.current[2]).toStrictEqual(new Error('Unknown error occured'));
  });
  it('should return undefined when error is an empty string', () => {
    useK8sWatchResourceMock.mockReturnValue([[], false, '']);

    const renderResult = testHook(useK8sWatchResourceList)(resource);

    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
  });
});
