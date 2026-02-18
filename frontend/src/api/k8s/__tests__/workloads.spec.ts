import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { WorkloadKind } from '#~/k8sTypes';
import { buildWorkloadMapForNotebooks, listWorkloads } from '#~/api/k8s/workloads';
import { WorkloadModel } from '#~/api/models/kueue';

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
