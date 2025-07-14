import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { AccessReviewResourceAttributes, K8sVerb } from '#~/k8sTypes';

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
