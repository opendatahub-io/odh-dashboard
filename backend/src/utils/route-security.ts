import { cloneDeep } from 'lodash';
import { getDashboardConfig } from './resourceUtils';
import { K8sResourceCommon, KubeFastifyInstance, Notebook, OauthFastifyRequest } from '../types';
import { getUserName } from './userUtils';
import { createCustomError } from './requestUtils';
import { FastifyReply, FastifyRequest } from 'fastify';
import { isUserAdmin } from './adminUtils';
import { RecursivePartial } from '../typeHelpers';

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

  const isReadRequest = request.method.toLowerCase() === 'get';

  // Api with no name object
  if (!name && namespace === notebookNamespace && isReadRequest) {
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

  // PVC api endpoint
  if (namespace === notebookNamespace && name === `jupyterhub-nb-${translatedUsername}-pvc`) {
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

/** Determine which type of call it is -- request body data or request params. */
const handleSecurityOnRouteData = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  needsAdmin: boolean,
): Promise<void> => {
  const username = await getUserName(fastify, request);
  const { dashboardNamespace } = getNamespaces(fastify);
  const isAdmin = await isUserAdmin(fastify, username, dashboardNamespace);
  if (isAdmin && !request.url.includes('secrets')) {
    // User is an admin, trust for all but secrets
    return;
  } else if (needsAdmin && !isAdmin) {
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

  if (isRequestBody(request)) {
    await requestSecurityGuard(
      fastify,
      request,
      request.body.metadata.name,
      request.body.metadata.namespace,
    );
  } else if (isRequestParams(request)) {
    await requestSecurityGuard(fastify, request, request.params.name, request.params.namespace);
  } else {
    // Route is un-parameterized
    if (request.method.toLowerCase() === 'get') {
      // Get calls are fine
      return;
    }

    // Not getting a resource, mutating something that is not verify-able theirs -- log the user encase of malicious behaviour
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
 * Sanitizes the properties of a Notebook against what we expect.
 * No sharing of secrets, configmaps, etc between users.
 */
export const sanitizeNotebookForSecurity = async <
  T extends RecursivePartial<Notebook> = RecursivePartial<Notebook>,
>(
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
  notebook: T,
): Promise<T> => {
  const secureNotebook = cloneDeep(notebook);
  const username = await getUserName(fastify, request);
  const translatedUsername = usernameTranslate(username);

  // PVCs
  secureNotebook?.spec?.template?.spec?.volumes?.forEach((volume) => {
    if (volume.name.startsWith('jupyterhub-nb-')) {
      // PVC we generated
      const allowedValue = `jupyterhub-nb-${translatedUsername}-pvc`;
      if (volume.name !== allowedValue) {
        // Was not targeted at their user
        fastify.log.warn(
          `${username} submitted a Notebook that contained a pvc (${volume.name}) that was not for them. Reset back to them.`,
        );
        fastify.log.warn(`PVC structure: ${JSON.stringify(volume)}`);

        volume.name = allowedValue;
        if (volume.persistentVolumeClaim) {
          volume.persistentVolumeClaim.claimName = allowedValue;
        }
      }
    }
  });

  // Container based items
  secureNotebook?.spec?.template?.spec?.containers?.forEach((container) => {
    // Secrets & ConfigMaps
    container.env?.forEach((env) => {
      if (env.name.startsWith('jupyterhub-singleuser-profile-')) {
        // Env var for a configmap or secret we generated
        const allowedValue = `jupyterhub-singleuser-profile-${translatedUsername}-env`;
        if (env.name !== allowedValue) {
          // Was not targeted at their user
          fastify.log.warn(
            `${username} submitted a Notebook that contained an env (${env.name}) that was not for them. Reset back to them.`,
          );
          fastify.log.warn(`Env structure: ${JSON.stringify(env)}`);

          env.name = allowedValue;
          if (env.valueFrom.configMapKeyRef) {
            env.valueFrom.configMapKeyRef.key = allowedValue;
          }
          if (env.valueFrom.secretKeyRef) {
            env.valueFrom.secretKeyRef.key = allowedValue;
          }
        }
      }
    });

    // Volume mounts
    container.volumeMounts?.forEach((volumeMount) => {
      if (volumeMount.name.startsWith('jupyterhub-nb-')) {
        // The volume mount's PVC we generated
        const allowedValue = `jupyterhub-nb-${translatedUsername}-pvc`;
        if (volumeMount.name !== allowedValue) {
          // Was not targeted at their user
          fastify.log.warn(
            `${username} submitted a Notebook that contained a volumeMount (${volumeMount.name}) that was not for them. Reset back to them.`,
          );
          fastify.log.warn(`volumeMount structure: ${JSON.stringify(volumeMount)}`);

          volumeMount.name = allowedValue;
        }
      }
    });
  });

  return secureNotebook;
};
