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
    const wl = workloadWithJobNameLabel('wl-1', 'my-notebook');
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind Job and name', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'wl-job',
      namespace: 'test-project',
      ownerName: 'my-notebook',
    });
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind Notebook and name', () => {
    const wl = workloadWithOwnerRefs('wl-nb', [{ kind: 'Notebook', name: 'my-notebook' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind StatefulSet with exact name', () => {
    const wl = workloadWithOwnerRefs('wl-ss', [{ kind: 'StatefulSet', name: 'my-notebook' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind StatefulSet with name prefix', () => {
    const wl = workloadWithOwnerRefs('wl-ss', [{ kind: 'StatefulSet', name: 'my-notebook-0' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind Pod with name notebookName-0', () => {
    const wl = workloadWithOwnerRefs('wl-pod', [{ kind: 'Pod', name: 'my-notebook-0' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('matches workload by ownerRef kind Pod with name starting with notebookName-', () => {
    const wl = workloadWithOwnerRefs('wl-pod', [{ kind: 'Pod', name: 'my-notebook-1' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('compares ownerRef kind case-insensitively', () => {
    const wl = workloadWithOwnerRefs('wl-lower', [{ kind: 'pod', name: 'my-notebook-0' }]);
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBe(wl);
  });

  it('prefers job-name label over ownerRef match', () => {
    const wlByLabel = workloadWithJobNameLabel('wl-by-label', 'my-notebook');
    const wlByOwner = mockWorkloadK8sResource({
      k8sName: 'wl-by-owner',
      namespace: 'test-project',
      ownerName: 'my-notebook',
    });
    const notebooks = [notebook('my-notebook')];
    const result = buildWorkloadMapForNotebooks([wlByOwner, wlByLabel], notebooks);
    expect(result['my-notebook']).toBe(wlByLabel);
  });

  it('returns null for notebook when no workload matches', () => {
    const wl = workloadWithJobNameLabel('wl-other', 'other-notebook');
    const notebooks = [notebook('my-notebook'), notebook('other-notebook')];
    const result = buildWorkloadMapForNotebooks([wl], notebooks);
    expect(result['my-notebook']).toBeNull();
    expect(result['other-notebook']).toBe(wl);
  });

  it('handles notebook with missing metadata.name', () => {
    const nb = mockNotebookK8sResource({ name: 'x' });
    nb.metadata.name = '';
    const result = buildWorkloadMapForNotebooks([], [nb]);
    expect(result['']).toBeNull();
  });
});
