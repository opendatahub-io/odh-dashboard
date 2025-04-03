import { K8sVerb } from '~/k8sTypes';
import { useAccessReview } from '~/api';

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
