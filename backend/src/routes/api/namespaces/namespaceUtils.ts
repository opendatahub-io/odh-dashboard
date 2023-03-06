import { PatchUtils } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { NamespaceApplicationCase } from './const';
import { KubeFastifyInstance } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { DEV_MODE, USER_ACCESS_TOKEN } from '../../../utils/constants';

export const applyNamespaceChange = (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
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

  const accessToken = request.headers[USER_ACCESS_TOKEN];

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
        ...(!DEV_MODE && { Authorization: `Bearer ${accessToken}` }),
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
