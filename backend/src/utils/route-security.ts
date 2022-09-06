import { getDashboardConfig } from './resourceUtils';
import { K8sResourceCommon, KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { getUserName } from './userUtils';
import { createCustomError } from './requestUtils';
import { FastifyReply, FastifyRequest } from 'fastify';

const usernameTranslate = (username: string): string => {
  const encodedUsername = encodeURIComponent(username);
  return encodedUsername
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a')
    .replace(/-/g, '%2d')
    .replace(/\./g, '%2e')
    .replace(/_/g, '%5f')
    .replace(/~/g, '%7f')
    .replace(/%/g, '-')
    .toLowerCase();
};

const getNamespaces = (
  fastify: KubeFastifyInstance,
): { dashboardNamespace: string; notebookNamespace: string } => {
  const config = getDashboardConfig();
  const notebookNamespace = config.spec.notebookController?.notebookNamespace;
  const fallbackNamespace = config.metadata.namespace || fastify.kube.namespace;

  return {
    notebookNamespace: notebookNamespace || fallbackNamespace,
    dashboardNamespace: fallbackNamespace,
  };
};

const requestSecurityGuard = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  namespace: string,
): Promise<void> => {
  const { notebookNamespace, dashboardNamespace } = getNamespaces(fastify);
  const username = await getUserName(fastify, request);
  const translatedUsername = usernameTranslate(username);

  if (dashboardNamespace === notebookNamespace || namespace === dashboardNamespace) {
    // Requesting something from the exclusive dashboard namespace -- can't validate cleanly
    return;
  }

  if (namespace !== notebookNamespace) {
    fastify.log.error(
      `Tried to interact with a resource outside (${namespace}) of the notebook namespace (${dashboardNamespace})`,
    );
    throw createCustomError(
      'Wrong namespace',
      'Cannot request a resource outside of the notebook namespace',
      403,
    );
  }
  if (!name.includes(translatedUsername)) {
    fastify.log.error(`User requested a resource that was not theirs. Resource: ${name}`);
    throw createCustomError(
      'Wrong resource',
      'Cannot request a resource that does not belong to you',
      401,
    );
  }
};

const isRequestBody = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Body: K8sResourceCommon }> =>
  !!(request?.body as K8sResourceCommon)?.metadata;

type K8sTargetParams = { name: string; namespace: string };
const isRequestParams = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Params: K8sTargetParams }> =>
  !!((request.params as K8sTargetParams)?.name && (request.params as K8sTargetParams)?.namespace);

/** Determine which type of call it is -- request body data or request params. */
const handleSecurityOnRouteData = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
): Promise<void> => {
  if (isRequestBody(request)) {
    await requestSecurityGuard(
      fastify,
      request,
      request.body.metadata.name,
      request.body.metadata.namespace,
    );
  }
  if (isRequestParams(request)) {
    await requestSecurityGuard(fastify, request, request.params.name, request.params.namespace);
  }
};

/**
 * Secure a route for only making k8s requests in the notebook namespace & of a resource in
 * their name (assumes resource contains their translated name).
 *
 * Takes the fastify instance, a callback to invoke one the security effort is complete, then
 * provides a function to fastify to get the route responses.
 * eg secureRoute(fastify)(the standard route function)
 */
export const secureRoute =
  <T>(fastify: KubeFastifyInstance) =>
  (requestCall: (request: FastifyRequest, reply: FastifyReply) => Promise<T>) =>
  async (request: OauthFastifyRequest, reply: FastifyReply): Promise<T> => {
    await handleSecurityOnRouteData(fastify, request);
    return requestCall(request, reply);
  };
