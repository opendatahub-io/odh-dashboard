import { K8sVerb } from '~/k8sTypes';
import { useAccessReview } from '~/api';

/**
 * Effectively this check is equivalent to checking if a user is a project admin, specifically on the verb passed.
 */

export const useProjectAccessReview = (
  verb: K8sVerb,
  projectName: string,
  shouldRunCheck?: boolean,
): ReturnType<typeof useAccessReview> =>
  useAccessReview(
    {
      group: 'project.openshift.io',
      resource: 'projects',
      name: projectName,
      verb,
    },
    shouldRunCheck,
  );

export const useProjectPermissionsAccessReview = (
  verb: K8sVerb,
  projectName: string,
  shouldRunCheck?: boolean,
): ReturnType<typeof useAccessReview> =>
  useAccessReview(
    {
      group: 'rbac.authorization.k8s.io',
      resource: 'rolebindings',
      namespace: projectName,
      verb,
    },
    shouldRunCheck,
  );
