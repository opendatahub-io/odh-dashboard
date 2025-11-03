import { FastifyReply, FastifyRequest } from 'fastify';
import httpProxy, { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import { K8sResourceCommon, KubeFastifyInstance, ServiceAddressAnnotation } from '../types';
import { isK8sStatus, passThroughResource } from './pass-through';
import { DEV_MODE } from './constants';
import { createCustomError } from './requestUtils';
import { getAccessToken, getDirectCallOptions } from './directCallUtils';
import { EitherNotBoth } from '../typeHelpers';
import { V1Service } from '@kubernetes/client-node';

export const getParam = <F extends FastifyRequest<any, any>>(req: F, name: string): string =>
  (req.params as { [key: string]: string })[name];

export const setParam = (req: FastifyRequest, name: string, value: string): string =>
  ((req.params as { [key: string]: string })[name] = value);

const notFoundError = (kind: string, name: string, e?: any, overrideMessage?: string) => {
  const message =
    e instanceof Error
      ? e.message
      : e && e.code && e.response
      ? `${e.code}: ${e.response.message}`
      : e;
  return createCustomError(
    'Not Found',
    `${kind} '${name}' ${overrideMessage || 'not found'}.${message ? ` ${message}` : ''}`,
    404,
  );
};

const setAuthorizationHeader = async (request: FastifyRequest, fastify: KubeFastifyInstance) => {
  const token = getAccessToken(await getDirectCallOptions(fastify, request, ''));
  request.headers.authorization = `Bearer ${token}`;
};

export const checkRequestLimitExceeded = (
  request: FastifyRequest,
  fastify: KubeFastifyInstance,
  reply: FastifyReply,
): boolean => {
  const limit = fastify.initialConfig.bodyLimit ?? 1024 * 1024;
  const maxLimitInMiB = (limit / 1024 / 1024).toFixed();
  const contentLength = Number(request.headers['content-length']);
  if (contentLength > limit) {
    reply.header('connection', 'close');
    reply.send(
      createCustomError(
        'Payload Too Large',
        `Request body is too large; the max limit is ${maxLimitInMiB} MiB`,
        413,
      ),
    );
    return true;
  }
  return false;
};

export const proxyService =
  <K extends K8sResourceCommon = never>(
    model: { apiGroup: string; apiVersion: string; plural: string; kind: string } | null,
    service: EitherNotBoth<
      {
        addressAnnotation?: ServiceAddressAnnotation;
        internalPort: number | string;
        prefix?: string;
        suffix?: string;
        namespace?: string | ((fastify: KubeFastifyInstance) => string);
      },
      {
        constructUrl: (resource: K) => string;
      }
    >,
    local: {
      host: string;
      port: number | string;
    },
    statusCheck?: (resource: K) => boolean,
    tls = true,
  ) =>
  async (fastify: KubeFastifyInstance): Promise<void> =>
    fastify.register(httpProxy, {
      upstream: '',
      prefix: service.namespace ? ':name' : '/:namespace/:name',
      rewritePrefix: '',
      replyOptions: {
        // preHandler must set the `upstream` param
        getUpstream: (request) => getParam(request, 'upstream'),
      },
      preHandler: (request, reply, done) => {
        if (checkRequestLimitExceeded(request, fastify, reply)) {
          return;
        }

        // see `prefix` for named params
        const serviceNamespace =
          typeof service.namespace === 'function' ? service.namespace(fastify) : service.namespace;
        const namespace = serviceNamespace ?? getParam(request, 'namespace');
        const name = getParam(request, 'name');
        const serviceName = `${service.prefix ?? ''}${name}${service.suffix ?? ''}`;
        const scheme = tls ? 'https' : 'http';
        const kc = fastify.kube.config;
        const cluster = kc.getCurrentCluster();

        const getServiceAddress = async (
          serviceName: string,
          resource?: K,
        ): Promise<string | null> => {
          if (DEV_MODE) {
            // Use port forwarding for local development:
            // kubectl port-forward -n <namespace> svc/<service-name> <local.port>:<service.port>
            return `${scheme}://${local.host}:${local.port}`;
          }
          if (service.constructUrl) {
            return service.constructUrl(resource);
          }
          if (service.addressAnnotation) {
            try {
              const k8sService = await passThroughResource<V1Service>(fastify, request, {
                url: `${cluster.server}/api/v1/namespaces/${namespace}/services/${serviceName}`,
                method: 'GET',
              });
              if (isK8sStatus(k8sService)) {
                fastify.log.error(
                  `Proxy failed to read k8s service ${serviceName} in namespace ${namespace}.`,
                );
                return null;
              }
              const address = k8sService.metadata?.annotations?.[service.addressAnnotation];
              if (address) {
                return `${scheme}://${address}`;
              }
              fastify.log.error(
                `Proxy could not find address annotation on k8s service ${serviceName} in namespace ${namespace}, falling back to internal address. Annotation expected: ${service.addressAnnotation}`,
              );
            } catch (e) {
              fastify.log.error(
                e,
                `Proxy failed to read k8s service ${serviceName} in namespace ${namespace}.`,
              );
              return null;
            }
          }
          // For services configured for internal addresses (no annotation), construct the URL
          // or if annotation is expected but missing, fall back to internal address for compatibility
          return `${scheme}://${serviceName}.${namespace}.svc.cluster.local:${service.internalPort}`;
        };

        const doServiceRequest = async (resource?: K) => {
          const upstream = await getServiceAddress(serviceName, resource);
          if (!upstream) {
            done(notFoundError('Service', serviceName, undefined, 'service unavailable'));
            return;
          }
          // Assign the `upstream` param so we can dynamically set the upstream URL for http-proxy
          setParam(request, 'upstream', upstream);
          if (tls) {
            await setAuthorizationHeader(request, fastify);
          }
          fastify.log.info(`Proxy ${request.method} request ${request.url} to ${upstream}`);
          done();
        };

        // If `model` is passed, we first check if the user is able to get a resource with that model and the given namespace/name.
        // We can use this to only proxy for users that can access some resource that manages the service.
        // If `statusCheck` is also passed, we can also make sure that resource passes some check before we proxy to the service.
        const doServiceRequestWithGatingResource = async () => {
          try {
            // Retreive the gating resource by name and namespace
            const resource = await passThroughResource<K>(fastify, request, {
              url: `${cluster.server}/apis/${model.apiGroup}/${model.apiVersion}/namespaces/${namespace}/${model.plural}/${name}`,
              method: 'GET',
            });
            if (isK8sStatus(resource)) {
              done(notFoundError(model.kind, name));
            } else if (!statusCheck || statusCheck(resource)) {
              doServiceRequest(resource);
            } else {
              done(notFoundError(model.kind, name, undefined, 'service unavailable'));
            }
          } catch (e) {
            done(notFoundError(model.kind, name, e));
          }
        };

        if (model) {
          doServiceRequestWithGatingResource();
        } else {
          doServiceRequest();
        }
      },
    });

export const registerProxy = async (
  fastify: KubeFastifyInstance,
  {
    prefix,
    rewritePrefix,
    service,
    local,
    authorize,
    tls,
    onError,
  }: {
    prefix: string;
    rewritePrefix: string;
    authorize?: boolean;
    tls?: boolean;
    service: {
      name: string;
      namespace: string;
      port: number | string;
    };
    local?: {
      host?: string;
      port?: number | string;
    };
    onError?: FastifyHttpProxyOptions['replyOptions']['onError'];
  },
): Promise<void> => {
  const scheme = tls ? 'https' : 'http';
  const upstream = DEV_MODE
    ? `${scheme}://${local?.host || 'localhost'}:${local?.port ?? service.port}`
    : `${scheme}://${service.name}.${service.namespace}.svc.cluster.local:${service.port}`;
  fastify.log.info(`Proxy setup for: ${prefix} -> ${upstream}`);
  return fastify.register(httpProxy, {
    prefix,
    rewritePrefix,
    upstream,
    replyOptions: {
      getUpstream: () => upstream,
      onError,
    },
    preHandler: async (request, reply) => {
      if (checkRequestLimitExceeded(request, fastify, reply)) {
        return;
      }
      if (authorize) {
        await setAuthorizationHeader(request, fastify);
      }
      fastify.log.info(`Proxy ${request.method} request ${request.url} to ${upstream}`);
    },
  });
};
