import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import {
  LLMD_MAIN_CONTAINER_NAME,
  LLMD_POD_ROLE_LABEL,
  LLMD_WORKLOAD_POD_COMPONENT,
} from '../deployments/constants';

type MockLLMInferenceServicePodOptions = Omit<
  Parameters<typeof mockPodK8sResource>[0],
  'labels'
> & {
  /** The owning LLMInferenceService; sets `app.kubernetes.io/name`. */
  llmInferenceServiceName: string;
  /** `app.kubernetes.io/component`; defaults to the single-node workload value. */
  component?: string;
  /** `llm-d.ai/role`: decode, prefill, or both; omitted when not given. */
  role?: string;
  /** Extra Pod labels; sets the two selector labels on top of them. */
  labels?: Record<string, string>;
};

/** A workload Pod as the LLMInferenceService controller labels it; the model server container is `main`. */
export const mockLLMInferenceServicePodK8sResource = ({
  llmInferenceServiceName,
  component = LLMD_WORKLOAD_POD_COMPONENT,
  role,
  labels,
  containerName = LLMD_MAIN_CONTAINER_NAME,
  ...options
}: MockLLMInferenceServicePodOptions): PodKind =>
  mockPodK8sResource({
    ...options,
    containerName,
    labels: {
      ...labels,
      'app.kubernetes.io/name': llmInferenceServiceName,
      'app.kubernetes.io/component': component,
      ...(role ? { [LLMD_POD_ROLE_LABEL]: role } : {}),
    },
  });
