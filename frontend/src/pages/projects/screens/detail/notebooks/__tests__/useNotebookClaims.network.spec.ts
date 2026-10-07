import { waitFor } from '@testing-library/react';
import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { PodModel, ResourceClaimModel } from '@odh-dashboard/k8s-core/api/models';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { useNotebookClaims } from '#~/pages/projects/screens/detail/notebooks/useNotebookClaims';

// The SDK is mocked, not the named APIs, so every Kubernetes read the hook makes is visible.
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

const getMock = jest.mocked(k8sGetResource);
const listMock = jest.mocked(k8sListResource);

const NAME = 'test-notebook';
const NAMESPACE = 'test-project';
const TEMPLATE = 'gpu-template';
const GENERATED_RC = 'test-notebook-0-gpu-abc12';

describe('useNotebookClaims network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only list Pods and GET the named ResourceClaim; never DeviceClasses, ResourceSlices, or Nodes', async () => {
    const pod = mockPodK8sResource({
      name: `${NAME}-0`,
      namespace: NAMESPACE,
      containerName: NAME,
      nodeName: 'worker-gpu-01',
      resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
      containerClaims: [{ name: 'gpu' }],
    });
    listMock.mockResolvedValue(mockK8sResourceList([pod]));
    getMock.mockResolvedValue(
      mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        allocationResults: [{ request: 'gpu', driver: 'd', pool: 'p', device: 'gpu-0' }],
      }),
    );
    const notebook = mockNotebookK8sResource({
      name: NAME,
      namespace: NAMESPACE,
      resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
      containerClaims: [{ name: 'gpu' }],
    });

    const renderResult = testHook(useNotebookClaims)(notebook, { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.state.status).toBe('allocated'),
    );

    // The node name comes from the Pod, never from a Node read.
    expect(renderResult.result.current.group.pod?.nodeName).toBe('worker-gpu-01');
    expect(listMock.mock.calls.map(([{ model }]) => model)).toEqual([PodModel]);
    expect(getMock.mock.calls.map(([{ model }]) => model)).toEqual([ResourceClaimModel]);
    expect(getMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: expect.objectContaining({ ns: NAMESPACE, name: GENERATED_RC }),
      }),
    );
  });
});
