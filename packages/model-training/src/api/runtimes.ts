import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { ClusterTrainingRuntimeModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { ClusterTrainingRuntimeKind } from '../k8sTypes';

/**
 * Get a ClusterTrainingRuntime by name
 * ClusterTrainingRuntimes are cluster-scoped resources that define runtime configurations
 *
 * @param name - The name of the ClusterTrainingRuntime
 * @param opts - Optional K8s API options
 * @returns Promise with the ClusterTrainingRuntime
 */
export const getClusterTrainingRuntime = (
  name: string,
  opts?: K8sAPIOptions,
): Promise<ClusterTrainingRuntimeKind> =>
  k8sGetResource<ClusterTrainingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ClusterTrainingRuntimeModel,
        queryOptions: { name },
      },
      opts,
    ),
  );
