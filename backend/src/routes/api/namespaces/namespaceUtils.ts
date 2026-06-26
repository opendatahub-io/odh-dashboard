import { PatchUtils, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import { NamespaceApplicationCase } from './const';
import { K8sStatus, KnownLabels, KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { isK8sStatus } from '../../../utils/pass-through';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { createSelfSubjectAccessReview } from '../../../utils/authUtils';

export const checkAdminNamespacePermission = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
): Promise<V1SelfSubjectAccessReview | K8sStatus> =>
  createSelfSubjectAccessReview(fastify, request, {
    group: 'project.openshift.io',
    resource: 'projects',
    subresource: '',
    verb: 'update',
    name,
    namespace: name,
  });

const checkEditNamespacePermission = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
): Promise<V1SelfSubjectAccessReview | K8sStatus> =>
  createSelfSubjectAccessReview(fastify, request, {
    group: 'serving.kserve.io',
    resource: 'servingruntimes',
    subresource: '',
    verb: 'create',
    name,
    namespace: name,
  });

export const MERGE_PATCH_OPTIONS = {
  headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
};

export const validateNotSystemNamespace = (name: string): void => {
  if (name.startsWith('openshift') || name.startsWith('kube')) {
    throw createCustomError(
      'Invalid namespace target',
      'Cannot mutate namespaces with "openshift" or "kube"',
      400,
    );
  }
};

export const ensureNamespaceAccessPermission = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  checkFn: typeof checkAdminNamespacePermission,
  forbiddenMessage = "You don't have permission to manage this namespace.",
): Promise<void> => {
  const review = await checkFn(fastify, request, name);
  if (isK8sStatus(review)) {
    throw createCustomError(review.reason, review.message, review.code);
  }
  if (!review.status.allowed) {
    fastify.log.error(`SSAR denied for namespace "${name}": ${review.status.reason}`);
    throw createCustomError('Forbidden', forbiddenMessage, 403);
  }
};

export const applyNamespaceChange = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  context: NamespaceApplicationCase,
  dryRun?: string,
): Promise<{ applied: boolean }> => {
  validateNotSystemNamespace(name);

  let annotations = {};
  let labels = {};
  let checkPermissionsFn = null;
  const config = getDashboardConfig(request);
  const isKueueDisabled = config.spec.dashboardConfig.disableKueue;
  switch (context) {
    case NamespaceApplicationCase.DSG_CREATION:
      {
        labels = {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          ...(!isKueueDisabled && { [KnownLabels.KUEUE_MANAGED]: 'true' }),
        };
        checkPermissionsFn = checkAdminNamespacePermission;
      }
      break;
    case NamespaceApplicationCase.KSERVE_PROMOTION:
      {
        labels = { 'modelmesh-enabled': 'false' };
        checkPermissionsFn = checkEditNamespacePermission;
      }
      break;
    case NamespaceApplicationCase.KSERVE_NIM_PROMOTION:
      {
        annotations = { 'opendatahub.io/nim-support': 'true' };
        checkPermissionsFn = checkEditNamespacePermission;
      }
      break;
    case NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM:
      {
        annotations = { 'opendatahub.io/nim-support': null };
        labels = { 'modelmesh-enabled': null };
        checkPermissionsFn = checkEditNamespacePermission;
      }
      break;
    default:
      throw createCustomError('Unknown configuration', 'Cannot apply namespace change', 400);
  }

  if (checkPermissionsFn === null) {
    throw createCustomError(
      'Invalid backend state -- dev broken workflow',
      'checkPermissionsFn is null -- appropriate permissions must be checked for all actions',
      500,
    );
  }
  await ensureNamespaceAccessPermission(
    fastify,
    request,
    name,
    checkPermissionsFn,
    "You don't have permission to update serving platform labels on the current project.",
  );

  return fastify.kube.coreV1Api
    .patchNamespace(
      name,
      { metadata: { annotations, labels } },
      undefined,
      dryRun,
      undefined,
      undefined,
      MERGE_PATCH_OPTIONS,
    )
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
