import { FastifyRequest } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { K8sResourceCommon, KubeFastifyInstance } from '../types';
import { isK8sStatus, passThroughResource } from '../routes/api/k8s/pass-through';
import { DEV_MODE } from './constants';
import { createCustomError } from './requestUtils';
import { getAccessToken, getDirectCallOptions } from './directCallUtils';

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

export const proxyService =
  <K extends K8sResourceCommon = never>(
    model: { apiGroup: string; apiVersion: string; plural: string; kind: string } | null,
    service: {
      port: number | string;
      prefix?: string;
      suffix?: string;
      namespace?: string;
    },
    local: {
      host: string;
      port: number | string;
    },
    statusCheck?: (resource: K) => boolean,
    tls = true,
  ) =>
  async (fastify: KubeFastifyInstance): Promise<void> => {
    fastify.register(httpProxy, {
      upstream: '',
      prefix: service.namespace ? ':name' : '/:namespace/:name',
      rewritePrefix: '',
      replyOptions: {
        // preHandler must set the `upstream` param
        getUpstream: (request) => getParam(request, 'upstream'),
      },
      preHandler: (request, reply, done) => {
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
          return;
        }
        // see `prefix` for named params
        const namespace = service.namespace ?? getParam(request, 'namespace');
        const name = getParam(request, 'name');

        const doServiceRequest = () => {
          const scheme = tls ? 'https' : 'http';

          const upstream = DEV_MODE
            ? // Use port forwarding for local development:
              // kubectl port-forward -n <namespace> svc/<service-name> <local.port>:<service.port>
              `${scheme}://${local.host}:${local.port}`
            : // Construct service URL
              `${scheme}://${service.prefix || ''}${name}${
                service.suffix ?? ''
              }.${namespace}.svc.cluster.local:${service.port}`;

          // assign the `upstream` param so we can dynamically set the upstream URL for http-proxy
          setParam(request, 'upstream', upstream);

          fastify.log.info(`Proxy ${request.method} request ${request.url} to ${upstream}`);
          done();
        };

        if (model) {
          const kc = fastify.kube.config;
          const cluster = kc.getCurrentCluster();

          // retreive the gating resource by name and namespace
          passThroughResource<K>(fastify, request, {
            url: `${cluster.server}/apis/${model.apiGroup}/${model.apiVersion}/namespaces/${namespace}/${model.plural}/${name}`,
            method: 'GET',
          })
            .then((resource) => {
              return getDirectCallOptions(fastify, request, request.url).then((requestOptions) => {
                if (isK8sStatus(resource)) {
                  done(notFoundError(model.kind, name));
                } else if (!statusCheck || statusCheck(resource)) {
                  if (tls) {
                    const token = getAccessToken(requestOptions);
                    request.headers.authorization = `Bearer ${token}`;
                  }

                  doServiceRequest();
                } else {
                  done(notFoundError(model.kind, name, undefined, 'service unavailable'));
                }
              });
            })
            .catch((e) => {
              done(notFoundError(model.kind, name, e));
            });
        } else {
          doServiceRequest();
        }
      },
    });
  };
