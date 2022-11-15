import { PatchUtils } from '@kubernetes/client-node';
import { NamespaceApplicationCase } from './const';
import { KubeFastifyInstance } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';

export const applyNamespaceChange = (
  fastify: KubeFastifyInstance,
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
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
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
