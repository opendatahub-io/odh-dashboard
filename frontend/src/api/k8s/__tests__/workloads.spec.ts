import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { WorkloadKind } from '#~/k8sTypes';
import {
  buildWorkloadMapForDeployments,
  buildWorkloadMapForNotebooks,
  listWorkloads,
} from '#~/api/k8s/workloads';
import { WorkloadModel } from '#~/api/models/kueue';

const IS_NAME = 'my-model';
const NS = 'test-project';
const POD_UID = 'pod-uid-abc123';
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<WorkloadKind>);

const TEST_NOTEBOOK_NAME = 'my-notebook';

const mockedWorkload = mockWorkloadK8sResource({
  k8sName: 'test-workload',
  namespace: 'test-project',
});

describe('listWorkloads', () => {
  it('should fetch and return workloads', async () => {
    k8sListResourceItemsMock.mockResolvedValue([mockedWorkload]);
    const result = await listWorkloads('test-project');
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: { ns: 'test-project' },
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockedWorkload]);
  });

  it('should pass labelSelector when provided', async () => {
    k8sListResourceItemsMock.mockResolvedValue([]);
    await listWorkloads('test-project', 'kueue.x-k8s.io/job-name=my-job');
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: {
        ns: 'test-project',
        queryParams: { labelSelector: 'kueue.x-k8s.io/job-name=my-job' },
      },
    });
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));
    await expect(listWorkloads('test-project')).rejects.toThrow('error1');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: { ns: 'test-project' },
    });
  });
});

function workloadWithOwnerRefs(
  name: string,
  ownerRefs: Array<{ kind: string; name: string }>,
): WorkloadKind {
  const wl = mockWorkloadK8sResource({ k8sName: name, namespace: 'test-project' });
  if (wl.metadata) {
    wl.metadata.ownerReferences = ownerRefs.map((ref) => ({
      apiVersion: 'v1',
      kind: ref.kind,
      name: ref.name,
      uid: `uid-${ref.kind}-${ref.name}`,
    }));
  }
  return wl;
}

function workloadWithJobNameLabel(workloadName: string, jobName: string): WorkloadKind {
  const wl = mockWorkloadK8sResource({ k8sName: workloadName, namespace: 'test-project' });
  if (wl.metadata) {
    wl.metadata.labels = { ...wl.metadata.labels, 'kueue.x-k8s.io/job-name': jobName };
  }
  return wl;
}

describe('buildWorkloadMapForNotebooks', () => {
  const notebook = (n: string) => mockNotebookK8sResource({ name: n });

  it('returns null for each notebook when workloads list is empty', () => {
    const notebooks = [notebook('nb1'), notebook('nb2')];
    const result = buildWorkloadMapForNotebooks([], notebooks);
    expect(result).toEqual({ nb1: null, nb2: null });
  });

  it('matches workload by kueue.x-k8s.io/job-name label', () => {
    const wl = workloadWithJobNameLabel('wl-1', TEST_NOTEBOOK_NAME);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind Job and name', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'wl-job',
      namespace: 'test-project',
      ownerName: TEST_NOTEBOOK_NAME,
    });
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind Job (explicit ownerReferences)', () => {
    const wl = workloadWithOwnerRefs('wl-job', [{ kind: 'Job', name: TEST_NOTEBOOK_NAME }]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind Notebook and name', () => {
    const wl = workloadWithOwnerRefs('wl-nb', [{ kind: 'Notebook', name: TEST_NOTEBOOK_NAME }]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind StatefulSet with exact name', () => {
    const wl = workloadWithOwnerRefs('wl-ss', [{ kind: 'StatefulSet', name: TEST_NOTEBOOK_NAME }]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind StatefulSet with name prefix', () => {
    const wl = workloadWithOwnerRefs('wl-ss', [
      { kind: 'StatefulSet', name: `${TEST_NOTEBOOK_NAME}-0` },
    ]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind Pod with name notebookName-0', () => {
    const wl = workloadWithOwnerRefs('wl-pod', [{ kind: 'Pod', name: `${TEST_NOTEBOOK_NAME}-0` }]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('matches workload by ownerRef kind Pod with name starting with notebookName-', () => {
    const wl = workloadWithOwnerRefs('wl-pod', [{ kind: 'Pod', name: `${TEST_NOTEBOOK_NAME}-1` }]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('does not match a pod ownerRef when the owner name only shares a same-length prefix', () => {
    const notebooks = [notebook('preempt-winner'), notebook('preempt-victim')];
    const wl = workloadWithOwnerRefs('wl-collision', [{ kind: 'Pod', name: 'preempt-winner-0' }]);

    const result = buildWorkloadMapForNotebooks([wl], notebooks);

    expect(result['preempt-winner']).toBe(wl);
    expect(result['preempt-victim']).toBeNull();
  });

  it('compares ownerRef kind case-insensitively', () => {
    const wl = workloadWithOwnerRefs('wl-lower', [
      { kind: 'pod', name: `${TEST_NOTEBOOK_NAME}-0` },
    ]);
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
  });

  it('prefers job-name label over ownerRef match', () => {
    const wlByLabel = workloadWithJobNameLabel('wl-by-label', TEST_NOTEBOOK_NAME);
    const wlByOwner = mockWorkloadK8sResource({
      k8sName: 'wl-by-owner',
      namespace: 'test-project',
      ownerName: TEST_NOTEBOOK_NAME,
    });
    const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
    const result = buildWorkloadMapForNotebooks([wlByOwner, wlByLabel], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBe(wlByLabel);
  });

  it('returns null for notebook when no workload matches', () => {
    const wl = workloadWithJobNameLabel('wl-other', 'other-notebook');
    const notebooks = [notebook(TEST_NOTEBOOK_NAME), notebook('other-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    expect(result['other-notebook']).toBe(wl);
  });
  describe('workloadMatchesNotebook (ownerRef matching)', () => {
    it('should not match when Job owner has different name', () => {
      const wl = workloadWithOwnerRefs('wl-job', [{ kind: 'Job', name: 'other-job' }]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should not match when Notebook owner has different name', () => {
      const wl = workloadWithOwnerRefs('wl-nb', [{ kind: 'Notebook', name: 'other-notebook' }]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should not match when StatefulSet owner name does not match or prefix', () => {
      const wl = workloadWithOwnerRefs('wl-ss', [
        { kind: 'StatefulSet', name: 'other-notebook-server' },
      ]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should not match when Pod owner name does not match or prefix', () => {
      const wl = workloadWithOwnerRefs('wl-pod', [{ kind: 'Pod', name: 'other-pod-0' }]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should not match when workload has no ownerReferences and no job-name label', () => {
      const wl = mockWorkloadK8sResource({
        k8sName: 'wl-orphan',
        namespace: 'test-project',
      });
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should not match when ownerReferences is empty array', () => {
      const wl = workloadWithOwnerRefs('wl-empty', []);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBeNull();
    });

    it('should match when first owner does not match but second owner matches', () => {
      const wl = workloadWithOwnerRefs('wl-multi', [
        { kind: 'Pod', name: 'other-pod-0' },
        { kind: 'Job', name: TEST_NOTEBOOK_NAME },
      ]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
    });

    it('should match ownerRef kind case-insensitively for Job', () => {
      const wl = workloadWithOwnerRefs('wl-job-lower', [{ kind: 'job', name: TEST_NOTEBOOK_NAME }]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
    });

    it('should match ownerRef kind case-insensitively for Notebook', () => {
      const wl = workloadWithOwnerRefs('wl-nb-lower', [
        { kind: 'notebook', name: TEST_NOTEBOOK_NAME },
      ]);
      const notebooks = [notebook(TEST_NOTEBOOK_NAME)];
      const result = buildWorkloadMapForNotebooks([wl], notebooks);
      expect(result[TEST_NOTEBOOK_NAME]).toBe(wl);
    });
  });

  it('should set result[""] to null when notebook has empty metadata.name', () => {
    const nb = mockNotebookK8sResource({ name: 'x' });
    nb.metadata.name = '';
    const result = buildWorkloadMapForNotebooks([], [nb]);
    expect(result['']).toBeNull();
  });
});

const inferenceService = (name: string) => mockInferenceServiceK8sResource({ name, namespace: NS });

/**
 * Build a Pod whose UID matches POD_UID and whose labels include the IS label.
 * The `uid` from genUID in mockPodK8sResource is random; override it here for determinism.
 */
function isPod(podName: string, isName: string, uid = POD_UID): PodKind {
  const pod = mockPodK8sResource({
    name: podName,
    namespace: NS,
    labels: { 'serving.kserve.io/inferenceservice': isName },
  });
  return { ...pod, metadata: { ...pod.metadata, uid } };
}

/**
 * Build a Workload whose ownerRef points to a Pod by UID.
 * This mirrors what Kueue's Plain Pod integration actually creates on a live cluster.
 */
function workloadWithPodOwnerRef(workloadName: string, podUid: string): WorkloadKind {
  const wl = mockWorkloadK8sResource({ k8sName: workloadName, namespace: NS });
  return {
    ...wl,
    metadata: {
      ...wl.metadata,
      ownerReferences: [
        {
          apiVersion: 'v1',
          kind: 'Pod',
          name: `model-predictor-${podUid.slice(0, 8)}`,
          uid: podUid,
        },
      ],
    },
  };
}

describe('buildWorkloadMapForDeployments', () => {
  it('seeds every IS with an empty array even when no workloads exist', () => {
    const result = buildWorkloadMapForDeployments([], [], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([]);
    expect(result[IS_NAME]).not.toBeNull();
  });

  it('correlates Workload to IS via Pod UID ownerRef + serving.kserve.io/inferenceservice label', () => {
    const pod = isPod('model-predictor-abc', IS_NAME);
    const wl = workloadWithPodOwnerRef('wl-1', POD_UID);
    const result = buildWorkloadMapForDeployments([wl], [pod], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([wl]);
  });

  it('returns empty array when Workload ownerRef Pod UID not in pods list (orphaned)', () => {
    const wl = workloadWithPodOwnerRef('wl-orphan', 'nonexistent-uid');
    const result = buildWorkloadMapForDeployments([wl], [], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([]);
  });

  it('returns empty array when Pod found but has no serving.kserve.io/inferenceservice label', () => {
    const rawPod = mockPodK8sResource({ name: 'unrelated-pod', namespace: NS });
    const pod = { ...rawPod, metadata: { ...rawPod.metadata, uid: POD_UID } };
    const wl = workloadWithPodOwnerRef('wl-1', POD_UID);
    const result = buildWorkloadMapForDeployments([wl], [pod], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([]);
  });

  it('skips Workloads that have no Pod ownerRef (non-IS workloads)', () => {
    // A Workload with no ownerRef or a non-Pod ownerRef should not appear for any IS.
    const rawWl = mockWorkloadK8sResource({ k8sName: 'wl-no-pod-ref', namespace: NS });
    const wl = { ...rawWl, metadata: { ...rawWl.metadata, ownerReferences: [] } };
    const result = buildWorkloadMapForDeployments([wl], [], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([]);
  });

  it('multi-replica IS: all per-Pod Workloads are included', () => {
    const uid0 = 'uid-pod-0';
    const uid1 = 'uid-pod-1';
    const pod0 = isPod('model-predictor-0', IS_NAME, uid0);
    const pod1 = isPod('model-predictor-1', IS_NAME, uid1);
    const wl0 = workloadWithPodOwnerRef('wl-replica-0', uid0);
    const wl1 = workloadWithPodOwnerRef('wl-replica-1', uid1);
    const result = buildWorkloadMapForDeployments(
      [wl0, wl1],
      [pod0, pod1],
      [inferenceService(IS_NAME)],
    );
    expect(result[IS_NAME]).toHaveLength(2);
    expect(result[IS_NAME]).toContain(wl0);
    expect(result[IS_NAME]).toContain(wl1);
  });

  it('Workload for one IS does not bleed into another IS entry', () => {
    const uidA = 'uid-pod-model-a';
    const uidB = 'uid-pod-model-b';
    const podA = isPod('predictor-a', 'model-a', uidA);
    const podB = isPod('predictor-b', 'model-b', uidB);
    const wlA = workloadWithPodOwnerRef('wl-a', uidA);
    const wlB = workloadWithPodOwnerRef('wl-b', uidB);
    const result = buildWorkloadMapForDeployments(
      [wlA, wlB],
      [podA, podB],
      [inferenceService('model-a'), inferenceService('model-b')],
    );
    expect(result['model-a']).toEqual([wlA]);
    expect(result['model-b']).toEqual([wlB]);
  });

  it('IS with undefined metadata.name is skipped — no key added to result', () => {
    const is = inferenceService(IS_NAME);
    // @ts-expect-error intentionally clearing name for test
    is.metadata.name = undefined;
    const result = buildWorkloadMapForDeployments([], [], [is]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('Pod whose IS label value is not a known IS is skipped', () => {
    // Pod labels an IS name that's not in the inferenceServices list.
    const pod = isPod('predictor-other', 'unknown-model', POD_UID);
    const wl = workloadWithPodOwnerRef('wl-unknown', POD_UID);
    const result = buildWorkloadMapForDeployments([wl], [pod], [inferenceService(IS_NAME)]);
    // The known IS has no workload; the unknown model is not added.
    expect(result[IS_NAME]).toEqual([]);
    expect(result['unknown-model']).toBeUndefined();
  });

  it('ownerRef kind matching is case-insensitive for Pod', () => {
    const pod = isPod('model-predictor-abc', IS_NAME, POD_UID);
    const wl = mockWorkloadK8sResource({ k8sName: 'wl-case', namespace: NS });
    if (wl.metadata) {
      wl.metadata.ownerReferences = [
        { apiVersion: 'v1', kind: 'pod', name: 'model-predictor-abc', uid: POD_UID },
      ];
    }
    const result = buildWorkloadMapForDeployments([wl], [pod], [inferenceService(IS_NAME)]);
    expect(result[IS_NAME]).toEqual([wl]);
  });
});
