import {
  KubeFastifyInstance,
  OauthFastifyRequest,
  PrometheusQueryRangeResponse,
  PrometheusQueryResponse,
  QueryType,
} from '../types';
import https from 'https';
import { getDirectCallOptions } from './directCallUtils';
import { DEV_MODE } from './constants';

const callPrometheus = async <T>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
  host: string,
  queryType: QueryType,
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
  const rawOptions = await getDirectCallOptions(fastify, request, url);
  const options = {
    ...rawOptions,
    headers: {
      ...rawOptions.headers,
      Accept: 'application/json',
    },
    rejectUnauthorized: false,
  };

  return new Promise((resolve, reject) => {
    fastify.log.info(`Making Prometheus call: ${url}`);
    fastify.log.info(`Prometheus query: ${query}`);

    const httpsRequest = https
      .get(url, options, (res) => {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk: any) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            fastify.log.info('Successful response from Prometheus.');
            if (parsedData.status === 'error') {
              reject({ code: 400, response: parsedData.error });
              return;
            }
            resolve({ code: 200, response: parsedData });
          } catch (e) {
            const errorMessage = e.message || e.toString();
            fastify.log.error(`Failure parsing the response from Prometheus. ${errorMessage}`);
            if (errorMessage.includes('Unexpected token < in JSON')) {
              reject({ code: 422, response: 'Unprocessable prometheus response' });
              return;
            }
            fastify.log.error(`Unparsed Prometheus data. ${rawData}`);
            reject({ code: 500, response: rawData });
          }
        });
      })
      .on('error', (e) => {
        fastify.log.error(`Failure calling Prometheus. ${e.message}`);
        reject({ code: 500, response: `Cannot fetch prometheus data, ${e.message}` });
      });
    httpsRequest.end();
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

export const callPrometheusPVC = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
): Promise<{ code: number; response: PrometheusQueryResponse }> =>
  callPrometheus(
    fastify,
    request,
    query,
    generatePrometheusHostURL(fastify, 'thanos-querier', 'openshift-monitoring', '9092'),
    QueryType.QUERY,
  );

export const callPrometheusServing = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
): Promise<{ code: number; response: PrometheusQueryRangeResponse }> =>
  callPrometheus(
    fastify,
    request,
    query,
    generatePrometheusHostURL(fastify, 'rhods-model-monitoring', 'redhat-ods-monitoring', '443'),
    QueryType.QUERY_RANGE,
  );
