import { KubeFastifyInstance, OauthFastifyRequest, PrometheusResponse } from '../types';
import https from 'https';
import { getDirectCallOptions } from './directCallUtils';
import { DEV_MODE } from './constants';

export const callPrometheus = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  query: string,
  namespace: string,
): Promise<{ code: number; response: PrometheusResponse }> => {
  if (!query) {
    fastify.log.warn('Prometheus call was made without a query');
    return Promise.reject({ code: 400, response: 'Failed to provide a query' });
  }

  // Use a local path to the thanos querier; only works on-cluster
  let host = `https://thanos-querier.openshift-monitoring.svc.cluster.local:9091`;
  if (DEV_MODE) {
    const apiPath = fastify.kube.config.getCurrentCluster().server;
    const namedHost = apiPath.slice('https://api.'.length).split(':')[0];
    host = `https://thanos-querier-openshift-monitoring.apps.${namedHost}`;
  }

  const url = `${host}/api/v1/query?namespace=${namespace}&query=${query}`;
  const rawOptions = await getDirectCallOptions(fastify, request, url);
  const options = { ...rawOptions, rejectUnauthorized: false };

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
            const parsedData: PrometheusResponse = JSON.parse(rawData);
            fastify.log.info('Successful response from Prometheus.');
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
