import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import {
  countActiveModelDeploymentPods,
  resolveKueueStatusForInferenceService,
  useWatchISPods,
  useWatchLLMISPods,
  useWatchWorkloads,
} from '../workloads';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sListResourceItems: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

beforeEach(() => jest.clearAllMocks());

describe('serving workload watches', () => {
  it.each([useWatchISPods, useWatchLLMISPods, useWatchWorkloads])(
    'should disable the underlying watch without a namespace (%p)',
    (watch) => {
      watch(undefined);
      expect(useK8sWatchResourceList).toHaveBeenCalledWith(null, expect.any(Object), undefined);
    },
  );

  it.each([useWatchISPods, useWatchLLMISPods, useWatchWorkloads])(
    'should forward the namespace and cancellation options (%p)',
    (watch) => {
      const opts = { signal: new AbortController().signal };
      watch('namespace', opts);
      expect(useK8sWatchResourceList).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: 'namespace', isList: true }),
        expect.any(Object),
        opts,
      );
    },
  );
});

describe('countActiveModelDeploymentPods', () => {
  it('should keep same-name serving kinds separate and ignore terminal pods', () => {
    const isPod = mockPodK8sResource({ labels: { 'serving.kserve.io/inferenceservice': 'model' } });
    const llmisPod = mockPodK8sResource({
      labels: {
        'app.kubernetes.io/name': 'model',
        'app.kubernetes.io/component': 'llminferenceservice-workload',
      },
    });
    const terminalPod = { ...isPod, status: { phase: 'Succeeded' } };
    expect(
      countActiveModelDeploymentPods('InferenceService/model', [isPod, llmisPod, terminalPod]),
    ).toBe(1);
    expect(
      countActiveModelDeploymentPods('LLMInferenceService/model', [isPod, llmisPod, terminalPod]),
    ).toBe(1);
    expect(countActiveModelDeploymentPods('Other/model', [isPod, llmisPod])).toBe(0);
  });
});

describe('resolveKueueStatusForInferenceService', () => {
  it('should use the generic Workload API within the deployment namespace', async () => {
    jest.mocked(k8sListResourceItems).mockResolvedValue([]);
    const service = mockInferenceServiceK8sResource({ name: 'model', namespace: 'namespace' });
    await expect(resolveKueueStatusForInferenceService(service, [])).resolves.toBeNull();
    expect(k8sListResourceItems).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: { ns: 'namespace' },
    });
  });

  it('should not query without a namespace', async () => {
    const service = mockInferenceServiceK8sResource({ namespace: '' });
    await expect(resolveKueueStatusForInferenceService(service, [])).resolves.toBeNull();
    expect(k8sListResourceItems).not.toHaveBeenCalled();
  });

  it.each([403, 404, 503])('should omit optional status after HTTP %s', async (code) => {
    jest
      .mocked(k8sListResourceItems)
      .mockRejectedValue(Object.assign(new Error('Unavailable'), { code }));
    const service = mockInferenceServiceK8sResource({ namespace: 'namespace' });
    await expect(resolveKueueStatusForInferenceService(service, [])).resolves.toBeNull();
  });
});
