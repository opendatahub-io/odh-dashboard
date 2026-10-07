import { waitFor } from '@testing-library/react';
import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { ResourceClaimModel, ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { mockInferenceServiceK8sResource } from '../../__mocks__/mockInferenceServiceK8sResource';
import type { Deployment } from '../../../extension-points';
import { useDeploymentClaims } from '../useDeploymentClaims';

// The SDK is mocked, not the named APIs, so every Kubernetes read the hook makes is visible.
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

const getMock = jest.mocked(k8sGetResource);
const listMock = jest.mocked(k8sListResource);

const NAMESPACE = 'test-project';
const TEMPLATE = 'single-gpu';
const RC_0 = 'dra-model-predictor-0-gpu-abc12';

describe('useDeploymentClaims network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only GET the named ResourceClaim and ResourceClaimTemplate; never DeviceClasses, ResourceSlices, or Nodes', async () => {
    const podOptions = {
      namespace: NAMESPACE,
      containerName: 'kserve-container',
      resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
      containerClaims: [{ name: 'gpu' }],
    };
    const deployment: Deployment = {
      modelServingPlatformId: 'kserve',
      model: mockInferenceServiceK8sResource({ name: 'dra-model', namespace: NAMESPACE }),
      pods: {
        data: [
          mockPodK8sResource({
            ...podOptions,
            name: 'dra-model-predictor-0',
            nodeName: 'worker-gpu-01',
            resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: RC_0 }],
          }),
          // A pending replica has no generated claim yet, so only its template is read.
          mockPodK8sResource({
            ...podOptions,
            name: 'dra-model-predictor-1',
            isPending: true,
            nodeName: null,
          }),
        ],
        loaded: true,
        containerNames: ['kserve-container'],
      },
    };
    getMock.mockImplementation(({ model }) =>
      Promise.resolve(
        model === ResourceClaimModel
          ? mockResourceClaim({ name: RC_0, namespace: NAMESPACE })
          : mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE }),
      ),
    );

    const renderResult = testHook(useDeploymentClaims)(deployment, { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.groups[1]?.claims[0]?.templateState?.status).toBe(
        'loaded',
      ),
    );

    expect(renderResult.result.current.groups[0].pod?.nodeName).toBe('worker-gpu-01');
    expect(listMock).not.toHaveBeenCalled();
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock.mock.calls.map(([{ model }]) => model)).toEqual(
      expect.arrayContaining([ResourceClaimModel, ResourceClaimTemplateModel]),
    );
    expect(getMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ResourceClaimModel,
        queryOptions: expect.objectContaining({ ns: NAMESPACE, name: RC_0 }),
      }),
    );
    expect(getMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ResourceClaimTemplateModel,
        queryOptions: expect.objectContaining({ ns: NAMESPACE, name: TEMPLATE }),
      }),
    );
  });
});
