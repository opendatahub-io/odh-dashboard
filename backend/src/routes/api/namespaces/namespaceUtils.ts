import { PatchUtils, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import { NamespaceApplicationCase } from './const';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { passThrough } from '../k8s/pass-through';

export const applyNamespaceChange = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  context: NamespaceApplicationCase,
): Promise<{ applied: boolean }> => {
  if (name.startsWith('openshift') || name.startsWith('kube')) {
    // Kubernetes and OpenShift namespaces are off limits to this flow
    throw createCustomError(
      'Invalid namespace target',
      'Cannot mutate namespaces with "openshift" or "kube"',
      400,
    );
  }
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();

  const selfSubjectAccessReviewResult = await passThrough<V1SelfSubjectAccessReview>(
    fastify,
    request,
    {
      url: `${cluster.server}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`,
      method: 'POST',
      requestData: JSON.stringify({
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          resourceAttributes: {
            group: 'project.openshift.io',
            resource: 'projects',
            subresource: '',
            verb: 'update',
            name,
            namespace: name,
          },
        },
      }),
    },
    true,
  );

  if (!selfSubjectAccessReviewResult.status.allowed) {
    throw createCustomError('Forbidden', "You don't have the access to update the namespace", 403);
  }

  let labels = {};
  switch (context) {
    case NamespaceApplicationCase.DSG_CREATION:
      labels = {
        'opendatahub.io/dashboard': 'true',
        'modelmesh-enabled': 'true',
      };
      break;
    case NamespaceApplicationCase.MODEL_SERVING_PROMOTION:
      labels = {
        'modelmesh-enabled': 'true',
      };
      break;
    default:
      throw createCustomError('Unknown configuration', 'Cannot apply namespace change', 400);
  }

  return fastify.kube.coreV1Api
    .patchNamespace(name, { metadata: { labels } }, undefined, undefined, undefined, undefined, {
      headers: {
        'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH,
      },
    })
    .then(() => ({ applied: true }))
    .catch((e) => {
      fastify.log.error(
        `Unable to update Namespace "${name}" with context "${
          NamespaceApplicationCase[context]
        }". ${e.response?.body?.message || e.message}`,
      );
      return { applied: false };
    });
};
