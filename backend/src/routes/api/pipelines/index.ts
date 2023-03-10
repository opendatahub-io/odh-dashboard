import https from 'https';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getDirectCallOptions } from '../../../utils/directCallUtils';
import { createCustomError } from '../../../utils/requestUtils';

const testCall = async (fastify: KubeFastifyInstance, request: OauthFastifyRequest) => {
  const host =
    'https://ds-pipeline-pipelines-definition-andrews-test.apps.aballant-2023-03-10.devcluster.openshift.com';
  const path = '/apis/v1beta1/pipelines';
  const url = `${host}${path}`;
  const autoOptions = await getDirectCallOptions(fastify, request, url);
  delete autoOptions.headers.Authorization;
  const requestData: Record<string, unknown> = null;

  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...autoOptions,
      method: 'GET',
    };

    fastify.log.info(`Calling pipelines at ${url}`);
    const httpsRequest = https
      .request(url, requestOptions, (res) => {
        let data = '';
        res
          .setEncoding('utf8')
          .on('data', (chunk) => {
            data += chunk;
          })
          .on('end', () => {
            let parsedData: unknown;
            try {
              parsedData = JSON.parse(data);
            } catch (e) {
              const errorMessage = e.message || e.toString();
              fastify.log.error(`Failure parsing the response from DS Pipelines. ${errorMessage}`);
              if (errorMessage.includes('Unexpected token < in JSON')) {
                reject({ code: 422, response: 'Unprocessable pipelines response' });
                return;
              }
              fastify.log.error(`Unparsed Prometheus data. ${data}`);
              reject({ code: 500, response: data });
              return;
            }

            fastify.log.info('Successful request, returning data to caller.');
            resolve(parsedData);
          })
          .on('error', (error) => {
            fastify.log.error(`Pipeline parsing response error: ${error}`);
            reject({ code: 500, response: error });
          });
      })
      .on('error', (error) => {
        fastify.log.error(`Pipeline request error: ${error}`);
        reject({ code: 500, response: error });
      });

    if (requestData) {
      httpsRequest.write(requestData);
    }

    httpsRequest.end();
  });
};

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: OauthFastifyRequest) => {
    return testCall(fastify, request).catch((e) => {
      if (e?.code) {
        throw createCustomError(
          'Error with pipelines call',
          e.response || 'Pipelines call error',
          e.code,
        );
      }
      throw e;
    });
  });
};
