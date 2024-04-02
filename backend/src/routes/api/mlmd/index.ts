import { FastifyRequest } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { DSPipelineKind, KubeFastifyInstance } from '../../../types';
import { isK8sStatus, passThroughResource } from '../k8s/pass-through';
import { DEV_MODE } from '../../../utils/constants';
import { createCustomError } from '../../../utils/requestUtils';

const getParam = <F extends FastifyRequest<any, any>>(req: F, name: string) =>
  (req.params as { [key: string]: string })[name];

const setParam = (req: FastifyRequest, name: string, value: string) =>
  ((req.params as { [key: string]: string })[name] = value);

const notFoundError = (name: string, e?: any, overrideMessage?: string) => {
  const message =
    e instanceof Error ? e.message : e.code && e.response ? `${e.code}: ${e.response.message}` : e;
  return createCustomError(
    'Not Found',
    `DSPA '${name}' ${overrideMessage || 'not found'}.${message ? ` ${message}` : ''}`,
    404,
  );
};

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  // Enable proxy-service for DEV_MODE only.
  if (DEV_MODE) {
    fastify.register(httpProxy, {
      upstream: '',
      prefix: '/:namespace/:name',
      rewritePrefix: '',
      replyOptions: {
        // preHandler must set the `upstream` param
        getUpstream: (request) => getParam(request, 'upstream'),
      },
      preHandler: (request, _, done) => {
        const kc = fastify.kube.config;
        const cluster = kc.getCurrentCluster();

        // see `prefix` for named params
        const namespace = getParam(request, 'namespace');
        const name = getParam(request, 'name');

        // retreive the DSPA by name and namespace
        passThroughResource<DSPipelineKind>(fastify, request, {
          url: `${cluster.server}/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${namespace}/datasciencepipelinesapplications/${name}`,
          method: 'GET',
        })
          .then((dspa) => {
            if (isK8sStatus(dspa)) {
              done(notFoundError(name));
            } else if (
              dspa.spec.dspVersion === 'v2' &&
              !!dspa.status?.conditions?.find(
                (c) => c.type === 'APIServerReady' && c.status === 'True',
              )
            ) {
              const upstream = DEV_MODE
                ? // Use port forwarding for local development
                  // kubectl port-forward -n <namespace> svc/ds-pipeline-metadata-envoy-<dspa name> <METADATA_ENVOY_SERVICE_PORT>:9090
                  `http://${process.env.METADATA_ENVOY_SERVICE_HOST}:${process.env.METADATA_ENVOY_SERVICE_PORT}`
                : // Construct service URL
                  `http://ds-pipeline-metadata-envoy-${dspa.metadata.name}.${dspa.metadata.namespace}.svc.cluster.local:9090`;

              // assign the `upstream` param so we can dynamically set the upstream URL for http-proxy
              setParam(request, 'upstream', upstream);

              fastify.log.info(`Proxy ${request.method} request ${request.url} to ${upstream}`);
              done();
            } else {
              done(notFoundError(name, undefined, 'service unavailable'));
            }
          })
          .catch((e) => {
            done(notFoundError(name, e));
          });
      },
    });
  }
};
