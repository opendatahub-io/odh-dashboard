import { KnownLabels, KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { setDashboardConfig } from '../config/configUtils';
import {
  checkAdminNamespacePermission,
  ensureNamespaceAccessPermission,
  MERGE_PATCH_OPTIONS,
  validateNotSystemNamespace,
} from '../namespaces/namespaceUtils';

export const GLOBAL_MLFLOW_LABEL_KEY = KnownLabels.GLOBAL_MLFLOW_WORKSPACE;
// Once we support multiple MLflow instances per namespace, this should
// be replaced with dynamic CR name selection from the API request.
export const GLOBAL_MLFLOW_CR_NAME = 'mlflow';
// Must match maxItems in the CRD schema for globalMLflowNamespaces
const MAX_GLOBAL_MLFLOW_NAMESPACES = 1;

const isNamespaceNotFound = (e: {
  code?: number;
  statusCode?: number;
  response?: { statusCode?: number; body?: { code?: number } };
}): boolean =>
  e.response?.statusCode === 404 ||
  e.response?.body?.code === 404 ||
  e.code === 404 ||
  e.statusCode === 404;

const validateNamespace = async (fastify: KubeFastifyInstance, name: string): Promise<void> => {
  validateNotSystemNamespace(name);

  try {
    await fastify.kube.coreV1Api.readNamespace(name);
  } catch (e) {
    if (isNamespaceNotFound(e)) {
      throw createCustomError('Namespace not found', `Namespace "${name}" does not exist`, 404);
    }
    fastify.log.error(
      { namespace: name, error: e.message },
      `Failed to validate namespace "${name}"`,
    );
    throw createCustomError(
      'Namespace validation failed',
      `Unable to validate namespace "${name}"`,
      e.response?.statusCode || e.statusCode || 500,
    );
  }
};

const applyGlobalMLflowLabel = async (
  fastify: KubeFastifyInstance,
  name: string,
): Promise<void> => {
  try {
    await fastify.kube.coreV1Api.patchNamespace(
      name,
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: GLOBAL_MLFLOW_CR_NAME } } },
      undefined,
      undefined,
      undefined,
      undefined,
      MERGE_PATCH_OPTIONS,
    );
  } catch (e) {
    if (isNamespaceNotFound(e)) {
      throw createCustomError(
        'Namespace not found',
        `Namespace "${name}" was deleted before the label could be applied`,
        404,
      );
    }
    const statusCode = e.response?.statusCode || e.statusCode;
    const reason =
      statusCode === 403
        ? 'insufficient permissions'
        : statusCode === 409
        ? 'conflict'
        : 'unexpected error';
    fastify.log.error(
      { namespace: name, error: e.response?.body?.message || e.message },
      `Failed to apply MLflow label to namespace "${name}"`,
    );
    throw createCustomError(
      'Label application failed',
      `Unable to apply global MLflow label to namespace "${name}": ${reason}`,
      statusCode,
    );
  }
};

const removeGlobalMLflowLabel = async (
  fastify: KubeFastifyInstance,
  name: string,
): Promise<string | null> => {
  try {
    await fastify.kube.coreV1Api.patchNamespace(
      name,
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: null } } },
      undefined,
      undefined,
      undefined,
      undefined,
      MERGE_PATCH_OPTIONS,
    );
    return null;
  } catch (e) {
    if (isNamespaceNotFound(e)) {
      fastify.log.warn(`Namespace "${name}" no longer exists; skipping label removal`);
      return null;
    }
    const clientMessage = `Failed to remove global MLflow label from namespace "${name}"`;
    fastify.log.warn(
      { namespace: name, error: e.response?.body?.message || e.message },
      clientMessage,
    );
    return clientMessage;
  }
};

export const updateGlobalMLflowNamespaces = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  newNamespaces: string[],
): Promise<{ success: boolean; globalMLflowNamespaces: string[]; warnings?: string[] }> => {
  const uniqueNamespaces = [...new Set(newNamespaces)];

  if (uniqueNamespaces.length > MAX_GLOBAL_MLFLOW_NAMESPACES) {
    throw createCustomError(
      'Validation error',
      `Currently only ${MAX_GLOBAL_MLFLOW_NAMESPACES} global MLflow namespace is supported`,
      400,
    );
  }

  const config = getDashboardConfig(request);
  const oldNamespaces = config.spec.globalMLflowNamespaces ?? [];

  const toAdd = uniqueNamespaces.filter((ns) => !oldNamespaces.includes(ns));
  const toRemove = oldNamespaces.filter((ns) => !uniqueNamespaces.includes(ns));

  for (const ns of toAdd) {
    await validateNamespace(fastify, ns);
    await ensureNamespaceAccessPermission(
      fastify,
      request,
      ns,
      checkAdminNamespacePermission,
      `You don't have permission to manage namespace "${ns}"`,
    );
  }

  for (const ns of toRemove) {
    await ensureNamespaceAccessPermission(
      fastify,
      request,
      ns,
      checkAdminNamespacePermission,
      `You don't have permission to manage namespace "${ns}"`,
    );
  }

  const warnings: string[] = [];
  for (const ns of toRemove) {
    const warning = await removeGlobalMLflowLabel(fastify, ns);
    if (warning) {
      warnings.push(warning);
    }
  }

  await setDashboardConfig(fastify, {
    spec: { globalMLflowNamespaces: uniqueNamespaces },
  });

  for (const ns of uniqueNamespaces) {
    await applyGlobalMLflowLabel(fastify, ns);
  }

  const result: { success: boolean; globalMLflowNamespaces: string[]; warnings?: string[] } = {
    success: true,
    globalMLflowNamespaces: uniqueNamespaces,
  };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  return result;
};
