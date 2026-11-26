import type { K8sVerb } from '@odh-dashboard/k8s-core';
import { useAccessReviewResult, useHostApiCore } from '@odh-dashboard/plugin-core/host-api';

/** Review the actual deployment target on hosts that supply a discovered Kubernetes resource. */
export const useDeploymentAccess = (
  verb: K8sVerb,
  namespace?: string,
  name?: string,
  enabled = true,
): { allowed: boolean; loaded: boolean; denied?: boolean; reason?: string } => {
  const { deploymentApi } = useHostApiCore();
  const supported = deploymentApi?.resources[deploymentApi.resource]?.includes(verb) === true;
  const review = useAccessReviewResult(
    {
      group: deploymentApi?.group,
      resource: deploymentApi?.resource,
      verb,
      namespace,
      name,
    },
    enabled && supported && !!namespace,
  );
  if (!deploymentApi) {
    return { allowed: true, loaded: true };
  }
  if (!enabled) {
    return { allowed: false, loaded: false };
  }
  if (!namespace) {
    return { allowed: false, loaded: true, reason: 'Select a project to check deployment access.' };
  }
  if (!supported) {
    return { allowed: false, loaded: true, reason: `The deployment API does not support ${verb}.` };
  }
  const target = `${verb} ${deploymentApi.resource} in project ${namespace}`;
  const reason = !review.loaded
    ? `Checking access to ${target}.`
    : review.error
    ? `Could not check access to ${target}: ${review.error.message}`
    : !review.allowed
    ? `Access denied to ${target}.`
    : undefined;
  return {
    allowed: review.allowed,
    loaded: review.loaded,
    denied: review.loaded && !review.allowed && !review.error,
    reason,
  };
};
