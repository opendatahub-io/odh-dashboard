import type { PodKind } from '@odh-dashboard/k8s-core';
import {
  applyNamespaceEnrichment,
  canPreserveNamespaceEnrichment,
  createNamespaceBundleState,
  type NamespaceWorkloadEnrichment,
  toDisplayBundle,
} from '../namespaceBundleState';
import type { NamespaceWorkloadBaseData } from '../clusterQueueWorkloads';

const mockPod = (name: string): PodKind => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name },
  spec: { containers: [{ name: 'main', image: 'test-image', env: [] }] },
});

const base = (namespace: string, workloadUid = 'uid-1'): NamespaceWorkloadBaseData => ({
  namespace,
  workloads: [
    {
      apiVersion: 'kueue.x-k8s.io/v1beta2',
      kind: 'Workload',
      metadata: { name: 'wl-1', namespace, uid: workloadUid },
      spec: { queueName: 'lq-1', podSets: [] },
    },
  ],
  localQueues: [],
});

const enrichment: NamespaceWorkloadEnrichment = {
  pods: [mockPod('pod-1')],
  statefulSets: [],
  inferenceServices: [],
  jobKindByUid: new Map(),
};

describe('namespaceBundleState', () => {
  it('does not preserve enrichment when workload identities change', () => {
    const previous = createNamespaceBundleState(base('dsp-1', 'uid-1'), undefined);
    const withEnrichment = applyNamespaceEnrichment(previous, enrichment, 1);

    expect(canPreserveNamespaceEnrichment(withEnrichment, base('dsp-1', 'uid-2'))).toBe(false);
    expect(createNamespaceBundleState(base('dsp-1', 'uid-2'), withEnrichment)).toEqual({
      base: base('dsp-1', 'uid-2'),
    });
  });

  it('preserves enrichment when workload identities match', () => {
    const previous = applyNamespaceEnrichment(
      createNamespaceBundleState(base('dsp-1'), undefined),
      enrichment,
      1,
    );

    const next = createNamespaceBundleState(base('dsp-1'), previous);
    expect(next.enrichment).toBe(enrichment);
  });

  it('only applies enrichment for the matching base generation', () => {
    const state = applyNamespaceEnrichment(
      createNamespaceBundleState(base('dsp-1'), undefined),
      enrichment,
      2,
    );

    expect(toDisplayBundle(state, 1, false).pods).toEqual([]);
    expect(toDisplayBundle(state, 2, false).pods).toEqual(enrichment.pods);
  });

  it('shows optimistic enrichment while B2 is in flight', () => {
    const state = applyNamespaceEnrichment(
      createNamespaceBundleState(base('dsp-1'), undefined),
      enrichment,
      1,
    );

    expect(toDisplayBundle(state, 2, true).pods).toEqual(enrichment.pods);
    expect(toDisplayBundle(state, 2, false).pods).toEqual([]);
  });
});
