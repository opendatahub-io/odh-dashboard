import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import type { DraLookups } from '@odh-dashboard/hardware-profiles/shared/dra/types';
import { useResourceClaimLookups } from '@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups';
import { mockInferenceServiceK8sResource } from '../../__mocks__/mockInferenceServiceK8sResource';
import type { Deployment, DeploymentPods } from '../../../extension-points';
import { selectClaimPods, useDeploymentClaims } from '../useDeploymentClaims';

jest.mock('@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups', () => ({
  useResourceClaimLookups: jest.fn(),
}));

const mockUseResourceClaimLookups = jest.mocked(useResourceClaimLookups);

const NAMESPACE = 'test-project';
const TEMPLATE = 'single-gpu';
const DIRECT_RC = 'shared-gpu';
const CONTAINER = 'kserve-container';
const EMPTY: DraLookups = { claims: {}, templates: {} };
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } }];
const RESULT = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'pool-a', device: 'gpu-0' };

const generatedClaimName = (pod: string) => `${pod}-gpu-abc12`;

const draPod = (
  name: string,
  overrides: Partial<Parameters<typeof mockPodK8sResource>[0]> = {},
): PodKind =>
  mockPodK8sResource({
    name,
    namespace: NAMESPACE,
    uid: name,
    containerName: CONTAINER,
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: generatedClaimName(name) }],
    containerClaims: [{ name: 'gpu' }],
    ...overrides,
  });

const deploymentWith = (pods?: Partial<DeploymentPods>): Deployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ name: 'dra-model', namespace: NAMESPACE }),
  ...(pods ? { pods: { data: [], loaded: true, containerNames: [CONTAINER], ...pods } } : {}),
});

const allocated = (name: string): DraLookups['claims'][string] => ({
  status: 'loaded',
  resource: mockResourceClaim({ name, requests: REQUESTS, allocationResults: [RESULT] }),
});

describe('selectClaimPods', () => {
  it('should keep only live Pods that declare claims, in name order', () => {
    const b = draPod('replica-b');
    const a = draPod('replica-a');
    const plain = mockPodK8sResource({ name: 'plain', namespace: NAMESPACE });
    const terminating = draPod('replica-c', { deletionTimestamp: '2026-01-01T00:00:00Z' });
    const failed = draPod('replica-d', { phase: 'Failed' });

    expect(selectClaimPods([b, plain, terminating, a, failed])).toEqual([a, b]);
  });
});

describe('useDeploymentClaims', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResourceClaimLookups.mockReturnValue(EMPTY);
  });

  it('should report no claims and request nothing for a deployment without Pods', () => {
    const renderResult = testHook(useDeploymentClaims)(deploymentWith(), { enabled: true });

    expect(renderResult.result.current).toEqual({
      hasClaims: false,
      podsLoaded: false,
      podsError: undefined,
      groups: [],
      containerNames: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockUseResourceClaimLookups).toHaveBeenCalledWith({
      namespace: NAMESPACE,
      claimNames: [],
      templateNames: [],
      enabled: false,
      refreshRate: 0,
    });
  });

  it('should report no claims for a non-DRA deployment even when enabled', () => {
    const plain = mockPodK8sResource({ name: 'plain', namespace: NAMESPACE });
    const renderResult = testHook(useDeploymentClaims)(deploymentWith({ data: [plain] }), {
      enabled: true,
    });

    expect(renderResult.result.current.hasClaims).toBe(false);
    expect(renderResult.result.current.groups).toEqual([]);
    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith(
      expect.objectContaining({ claimNames: [], templateNames: [], enabled: false }),
    );
  });

  it('should keep lookups disabled and unpolled while the row is collapsed', () => {
    testHook(useDeploymentClaims)(deploymentWith({ data: [draPod('replica-0')] }), {
      enabled: false,
      refreshRate: 1000,
    });

    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith({
      namespace: NAMESPACE,
      claimNames: [generatedClaimName('replica-0')],
      templateNames: [],
      enabled: false,
      refreshRate: 0,
    });
  });

  it('should resolve one group for a single replica', () => {
    const pod = draPod('replica-0', { nodeName: 'worker-gpu-01' });
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [generatedClaimName('replica-0')]: allocated(generatedClaimName('replica-0')) },
      templates: {},
    });

    const renderResult = testHook(useDeploymentClaims)(deploymentWith({ data: [pod] }), {
      enabled: true,
    });

    const { hasClaims, groups, containerNames, podsLoaded } = renderResult.result.current;
    expect(hasClaims).toBe(true);
    expect(podsLoaded).toBe(true);
    expect(containerNames).toEqual([CONTAINER]);
    expect(groups).toHaveLength(1);
    expect(groups[0].pod).toEqual({ name: 'replica-0', nodeName: 'worker-gpu-01' });
    expect(groups[0].claims[0].resourceClaimName).toBe(generatedClaimName('replica-0'));
    expect(groups[0].claims[0].state).toMatchObject({ status: 'allocated' });
    expect(groups[0].claims[0].reference.consumers).toEqual([
      { containerName: CONTAINER, requestName: undefined },
    ]);
  });

  it('should add the platform Pod description only when the platform supplies one', () => {
    const prefill = draPod('prefill-0');
    const decode = draPod('decode-0');
    mockUseResourceClaimLookups.mockReturnValue(EMPTY);
    const podDescriptions = { 'prefill-0': 'prefill' };

    const renderResult = testHook(useDeploymentClaims)(
      deploymentWith({ data: [prefill, decode], podDescriptions }),
      { enabled: true },
    );

    const { groups } = renderResult.result.current;
    expect(groups.map((group) => group.pod)).toEqual([
      { name: 'decode-0', nodeName: 'user-xz6d2-worker-0-hw2hq' },
      { name: 'prefill-0', nodeName: 'user-xz6d2-worker-0-hw2hq', description: 'prefill' },
    ]);

    // Platforms without descriptions keep the previous identity shape.
    renderResult.rerender(deploymentWith({ data: [prefill, decode] }), { enabled: true });
    expect(renderResult.result.current.groups.map((group) => group.pod)).toEqual([
      { name: 'decode-0', nodeName: 'user-xz6d2-worker-0-hw2hq' },
      { name: 'prefill-0', nodeName: 'user-xz6d2-worker-0-hw2hq' },
    ]);
  });

  it('should keep one group per replica and look up every claim once', () => {
    const allocatedPod = draPod('replica-0');
    // A pending replica has no generated claim yet, so only its template can be read.
    const pendingPod = draPod('replica-1', {
      isPending: true,
      nodeName: null,
      resourceClaimStatuses: undefined,
    });
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [generatedClaimName('replica-0')]: allocated(generatedClaimName('replica-0')) },
      templates: {},
    });

    const renderResult = testHook(useDeploymentClaims)(
      deploymentWith({ data: [pendingPod, allocatedPod] }),
      { enabled: true },
    );

    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith({
      namespace: NAMESPACE,
      claimNames: [generatedClaimName('replica-0')],
      templateNames: [TEMPLATE],
      enabled: true,
      refreshRate: 0,
    });
    const { groups } = renderResult.result.current;
    expect(groups.map((group) => group.pod?.name)).toEqual(['replica-0', 'replica-1']);
    expect(groups[0].claims[0].state).toMatchObject({ status: 'allocated' });
    expect(groups[1].claims[0].resourceClaimName).toBeUndefined();
    expect(groups[1].claims[0].state).toEqual({ status: 'pending', reason: 'generation' });
  });

  it('should fetch a direct claim shared by two replicas only once', () => {
    const sharedPod = (name: string) =>
      mockPodK8sResource({
        name,
        namespace: NAMESPACE,
        uid: name,
        containerName: CONTAINER,
        resourceClaims: [{ name: 'shared', resourceClaimName: DIRECT_RC }],
        containerClaims: [{ name: 'shared' }],
      });

    testHook(useDeploymentClaims)(
      deploymentWith({ data: [sharedPod('replica-0'), sharedPod('replica-1')] }),
      { enabled: true },
    );

    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith(
      expect.objectContaining({ claimNames: [DIRECT_RC], templateNames: [] }),
    );
  });

  it('should keep a loaded replica when a sibling lookup fails', () => {
    mockUseResourceClaimLookups.mockReturnValue({
      claims: {
        [generatedClaimName('replica-0')]: allocated(generatedClaimName('replica-0')),
        [generatedClaimName('replica-1')]: { status: 'forbidden' },
      },
      templates: {},
    });

    const renderResult = testHook(useDeploymentClaims)(
      deploymentWith({ data: [draPod('replica-0'), draPod('replica-1')] }),
      { enabled: true },
    );

    const { groups } = renderResult.result.current;
    expect(groups[0].claims[0].state).toMatchObject({ status: 'allocated' });
    expect(groups[1].claims[0].state).toEqual({ status: 'forbidden' });
    expect(groups[1].claims[0].resourceClaimName).toBe(generatedClaimName('replica-1'));
  });

  it('should pass the Pod watch error through with the Pods it still has', () => {
    const podsError = new Error('watch failed');
    const renderResult = testHook(useDeploymentClaims)(
      deploymentWith({ data: [draPod('replica-0')], loaded: true, error: podsError }),
      { enabled: true },
    );

    expect(renderResult.result.current.podsError).toBe(podsError);
    expect(renderResult.result.current.hasClaims).toBe(true);
  });
});
