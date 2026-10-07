import type { PodKind } from '@odh-dashboard/k8s-core';

// The container the dashboard writes to spec.template.containers; the controller keeps the name on every workload Pod.
export const LLMD_MAIN_CONTAINER_NAME = 'main';

// app.kubernetes.io/component of the single-node decode Pod; the only workload component the status logic reads.
export const LLMD_WORKLOAD_POD_COMPONENT = 'llminferenceservice-workload';

// Every workload component the LLMInferenceService controller stamps: single-node, prefill, multi-node leader/worker.
export const LLMD_WORKLOAD_POD_COMPONENTS = [
  LLMD_WORKLOAD_POD_COMPONENT,
  'llminferenceservice-workload-prefill',
  'llminferenceservice-workload-worker',
  'llminferenceservice-workload-leader',
  'llminferenceservice-workload-worker-prefill',
  'llminferenceservice-workload-leader-prefill',
];

// Role the controller stamps on workload Pods: decode, prefill, or both.
export const LLMD_POD_ROLE_LABEL = 'llm-d.ai/role';

export const getLLMdPodRole = (pod: PodKind): string | undefined =>
  pod.metadata.labels?.[LLMD_POD_ROLE_LABEL] || undefined;

/** Pod name to llm-d role, for the Pods that carry the label. */
export const getLLMdPodDescriptions = (pods: PodKind[]): Record<string, string> =>
  Object.fromEntries(
    pods.flatMap((pod) => {
      const role = getLLMdPodRole(pod);
      return role ? [[pod.metadata.name, role] as const] : [];
    }),
  );
