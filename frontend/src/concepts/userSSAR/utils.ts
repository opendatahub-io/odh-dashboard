import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { AccessReviewResourceAttributes, K8sVerb } from '@odh-dashboard/k8s-core';

/** Shortcut access to simply reuse -- use AccessReviewResourceAttributes if you need full flexibility */
export const verbModelAccess = (
  verb: K8sVerb,
  model: K8sModelCommon,
  namespace?: string,
): AccessReviewResourceAttributes => ({
  group: model.apiGroup,
  resource: model.plural,
  verb,
  namespace,
});
