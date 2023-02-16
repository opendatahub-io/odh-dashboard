import {
  K8sResourceCommon,
  KubeFastifyInstance,
  NotebookData,
  NotebookState,
  OauthFastifyRequest,
} from '../types';
import { getOpenshiftUser, getUserName, usernameTranslate } from './userUtils';
import { createCustomError } from './requestUtils';
import { FastifyReply, FastifyRequest } from 'fastify';
import { isUserAdmin } from './adminUtils';
import { getNamespaces } from './notebookUtils';
import { logRequestDetails } from './fileUtils';
import { DEV_MODE } from './constants';

const testAdmin = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  needsAdmin: boolean,
): Promise<boolean> => {
  const username = await getUserName(fastify, request);
  const { dashboardNamespace } = getNamespaces(fastify);
  const isAdmin = await isUserAdmin(fastify, username, dashboardNamespace);
  if (isAdmin) {
    // User is an admin, pass to caller that we can bypass some logic
    return true;
  }

  if (needsAdmin && !isAdmin) {
    // Not an admin, route needs one -- reject
    fastify.log.error(
      `A Non-Admin User (${username}) made a request against an endpoint that requires an admin.`,
    );
    throw createCustomError(
      'Not Admin',
      'You lack the sufficient permissions to make this request.',
      401,
    );
  }

  return false; // Not admin, no bypassing
};

const requestSecurityGuardNotebook = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  username: string,
): Promise<void> => {
  // Check first admin to not give away if a user does not exist to regular users
  await testAdmin(fastify, request, true);

  try {
    await getOpenshiftUser(fastify, username);
  } catch (e) {
    throw createCustomError(
      'Wrong username',
      'Request invalid against a username that does not exist.',
      403,
    );
  }
};

const requestSecurityGuard = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  namespace: string,
  needsAdmin: boolean,
): Promise<void> => {
  const { notebookNamespace, dashboardNamespace } = getNamespaces(fastify);
  const username = await getUserName(fastify, request);
  const translatedUsername = usernameTranslate(username);
  const isReadRequest = request.method.toLowerCase() === 'get';

  // Check to see if a request was made against one of our namespaces
  if (![notebookNamespace, dashboardNamespace].includes(namespace)) {
    // Not a valid namespace -- cannot make direct calls to just any namespace no matter who you are
    fastify.log.error(
      `User requested a resource that was not in our namespaces. Namespace: ${namespace}`,
    );
    throw createCustomError(
      'Wrong namespace',
      'Request invalid against a resource from a non dashboard namespace.',
      403,
    );
  }

  // Requested a resource with an explicit empty name, doesn't matter who you are, bad API request
  if (name === '' || name?.trim() === '') {
    throw createCustomError('404 Endpoint Not Found', 'Not Found', 404);
  }

  // Admins have the ability to interact with other resources that is not theirs
  if (await testAdmin(fastify, request, needsAdmin)) {
    return;
  }

  // Api with no name object, allow reads
  if (name == null && namespace === notebookNamespace && isReadRequest) {
    return;
  }

  // RoleBinding -- first users to access the dash
  if (namespace === dashboardNamespace && name === `${notebookNamespace}-image-pullers`) {
    return;
  }

  // Notebook api endpoint
  if (namespace === notebookNamespace && name === `jupyter-nb-${translatedUsername}`) {
    return;
  }

  // ConfigMap and Secret endpoint (for env variables)
  if (
    namespace === notebookNamespace &&
    name === `jupyterhub-singleuser-profile-${translatedUsername}-envs`
  ) {
    return;
  }

  fastify.log.error(`User requested a resource that was not theirs. Resource: ${name}`);
  throw createCustomError(
    'Wrong resource',
    'Request invalid against a resource that does not belong to you',
    403,
  );
};

type K8sTargetParams = { name?: string; namespace: string };

const isRequestParams = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Params: K8sTargetParams }> =>
  !!(request.params as K8sTargetParams)?.namespace;

const isRequestBody = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Body: K8sResourceCommon }> =>
  !!(request?.body as K8sResourceCommon)?.metadata?.namespace;

const isRequestNotebookAdmin = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Body: NotebookData }> =>
  !!(request?.body as NotebookData)?.username;

const isRequestNotebookEndpoint = (
  request: FastifyRequest,
): request is OauthFastifyRequest<{ Body: NotebookData }> =>
  request.url === '/api/notebooks' &&
  Object.values(NotebookState).includes((request.body as NotebookData)?.state);

/** Determine which type of call it is -- request body data or request params. */
const handleSecurityOnRouteData = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  needsAdmin: boolean,
): Promise<void> => {
  logRequestDetails(fastify, request, needsAdmin);

  if (isRequestBody(request)) {
    await requestSecurityGuard(
      fastify,
      request,
      request.body.metadata.name,
      request.body.metadata.namespace,
      needsAdmin,
    );
  } else if (isRequestParams(request)) {
    await requestSecurityGuard(
      fastify,
      request,
      request.params.name,
      request.params.namespace,
      needsAdmin,
    );
  } else if (isRequestNotebookAdmin(request)) {
    await requestSecurityGuardNotebook(fastify, request, request.body.username);
  } else if (isRequestNotebookEndpoint(request)) {
    // Endpoint has self validation internal
    return;
  } else {
    // Route is un-parameterized
    if (await testAdmin(fastify, request, needsAdmin)) {
      // Admins have wider access, allow anything un-parameterized
      return;
    }

    if (request.method.toLowerCase() === 'get') {
      // Get calls are fine
      return;
    }

    // Not getting a resource, mutating something that is not verify-able theirs -- log the user encase of malicious behaviour
    const username = await getUserName(fastify, request);
    const { dashboardNamespace } = getNamespaces(fastify);
    const isAdmin = await isUserAdmin(fastify, username, dashboardNamespace);
    fastify.log.warn(
      `${isAdmin ? 'Admin ' : ''}User ${username} interacted with a resource that was not secure.`,
    );
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
  <T>(fastify: KubeFastifyInstance, needsAdmin = false) =>
  (requestCall: (request: FastifyRequest, reply: FastifyReply) => Promise<T>) =>
  async (request: OauthFastifyRequest, reply: FastifyReply): Promise<T> => {
    await handleSecurityOnRouteData(fastify, request, needsAdmin);
    return requestCall(request, reply);
  };

/**
 * Same as secure route -- just makes sure you're an admin as well. Useful to lock down routes
 * that should only be visible to a logged in admin user.
 */
export const secureAdminRoute = (fastify: KubeFastifyInstance): ReturnType<typeof secureRoute> =>
  secureRoute(fastify, true);

/**
 * Make sure the route can only be called in DEV MODE
 */
export const devRoute =
  <T>(requestCall: (request: FastifyRequest, reply: FastifyReply) => Promise<T>) =>
  async (request: OauthFastifyRequest, reply: FastifyReply): Promise<T> => {
    if (!DEV_MODE) {
      throw createCustomError('404 Endpoint Not Found', 'Not Found', 404);
    }
    return requestCall(request, reply);
  };
