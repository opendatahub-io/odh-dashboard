import { V1ResourceAttributes, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import { K8sStatus, KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { passThroughResource } from './pass-through';

/**
 * Using the Pass-Through API, invoke a SelfSubjectAccessReview (SSAR) to determine if user has
 * access to something before attempting it.
 *
 * Note: This is better than using the k8s library for this action because we want to migrate away
 * from that eventually and into BFF's using the better supported K8s lib.
 */
export const createSelfSubjectAccessReview = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  resourceAttributes: V1ResourceAttributes,
): Promise<V1SelfSubjectAccessReview | K8sStatus> => {
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();
  const selfSubjectAccessReviewObject: V1SelfSubjectAccessReview = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: { resourceAttributes },
  };
  return passThroughResource<V1SelfSubjectAccessReview>(fastify, request, {
    url: `${cluster.server}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`,
    method: 'POST',
    requestData: JSON.stringify(selfSubjectAccessReviewObject),
  });
};
