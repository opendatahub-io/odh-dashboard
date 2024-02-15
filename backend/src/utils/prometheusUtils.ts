import { KubeFastifyInstance, OauthFastifyRequest, QueryType } from '../types';
import { DEV_MODE, THANOS_INSTANCE_NAME, THANOS_NAMESPACE, THANOS_RBAC_PORT } from './constants';
import { createCustomError } from './requestUtils';
import { proxyCall, ProxyError, ProxyErrorType } from './httpUtils';

const callPrometheus = async <T>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
  host: string,
  queryType: QueryType,
  rejectOnHttpErrorCode = false,
): Promise<{ code: number; response: T }> => {
  if (!query) {
    fastify.log.warn('Prometheus call was made without a query');
    return Promise.reject({ code: 400, response: 'Failed to provide a query' });
  }

  if (!host) {
    fastify.log.warn('Prometheus call was made with a host that does not exist');
    return Promise.reject({ code: 400, response: 'Failed to find the prometheus instance host' });
  }

  const url = `${host}/api/v1/${queryType}?${query}`;

  fastify.log.info(`Prometheus query: ${query}`);
  return proxyCall(fastify, request, {
    method: 'GET',
    url,
    rejectUnauthorized: false,
  })
    .then(([rawData, status]) => {
      if (rejectOnHttpErrorCode && status.code >= 400) {
        throw createCustomError(status.message, rawData, status.code);
      }
      try {
        const parsedData = JSON.parse(rawData);
        if (parsedData.status === 'error') {
          throw { code: 400, response: parsedData.error };
        }
        fastify.log.info('Successful response from Prometheus.');
        return { code: 200, response: parsedData };
      } catch (e) {
        const errorMessage = e.message || 'Unknown reason.';
        fastify.log.error(`Failure parsing the response from Prometheus. ${errorMessage}`);
        if (errorMessage.includes('Unexpected token < in JSON')) {
          throw { code: 422, response: 'Unprocessable prometheus response' };
        }
        fastify.log.error(`Unparsed Prometheus data. ${rawData}`);
        throw { code: 500, response: rawData };
      }
    })
    .catch((error) => {
      let errorMessage = 'Unknown error';
      if (error instanceof ProxyError) {
        errorMessage = error.message || errorMessage;
        switch (error.proxyErrorType) {
          case ProxyErrorType.HTTP_FAILURE:
            fastify.log.error(`Failure calling Prometheus. ${errorMessage}`);
            throw { code: 500, response: `Cannot fetch prometheus data, ${errorMessage}` };
          default:
          // unhandled type, fall-through
        }
      } else if (!(error instanceof Error)) {
        errorMessage = JSON.stringify(error);
      }

      fastify.log.error(`Unhandled error during prometheus call: ${errorMessage}`);
      throw error;
    });
};

const generatePrometheusHostURL = (
  fastify: KubeFastifyInstance,
  instanceName: string,
  namespace: string,
  port: string,
): string => {
  if (DEV_MODE) {
    const apiPath = fastify.kube.config.getCurrentCluster().server;
    const namedHost = apiPath.slice('https://api.'.length).split(':')[0];
    return `https://${instanceName}-${namespace}.apps.${namedHost}`;
  }
  return `https://${instanceName}.${namespace}.svc.cluster.local:${port}`;
};

export const callPrometheusThanos = <T>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
  queryType: QueryType = QueryType.QUERY,
): Promise<{ code: number; response: T }> =>
  callPrometheus<T>(
    fastify,
    request,
    query,
    generatePrometheusHostURL(fastify, THANOS_INSTANCE_NAME, THANOS_NAMESPACE, THANOS_RBAC_PORT),
    queryType,
    true,
  );
