import https, { RequestOptions } from 'https';
import {
  K8sResourceCommon,
  K8sStatus,
  KubeFastifyInstance,
  OauthFastifyRequest,
} from '../../../types';
import { DEV_MODE } from '../../../utils/constants';
import { getDirectCallOptions } from '../../../utils/directCallUtils';

type PassThroughData = {
  method: string;
  requestData: string;
  url: string;
};

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  (data as K8sStatus).kind === 'Status';

const setupRequest = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<RequestOptions> => {
  const { method, url } = data;

  const requestOptions = await getDirectCallOptions(fastify, request, url);

  return {
    ...requestOptions,
    method,
  };
};

export const passThrough = <T extends K8sResourceCommon>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<T | K8sStatus> => {
  const { method, url } = data;

  // TODO: Remove when bug is fixed - https://issues.redhat.com/browse/HAC-1825
  let safeURL = url;
  if (method.toLowerCase() === 'post' && !url.endsWith('selfsubjectaccessreviews')) {
    // Core SDK builds the wrong path for k8s -- can't post to a resource name; remove the name from the url
    // eg: POST /.../configmaps/my-config-map => POST /.../configmaps
    // Note: SelfSubjectAccessReviews do not include a resource name
    const urlParts = url.split('/');
    const queryParams = urlParts[urlParts.length - 1].split('?');
    urlParts.pop();
    queryParams.shift();
    safeURL = urlParts.join('/');
    queryParams.unshift(safeURL);
    safeURL = queryParams.join('?');
  }

  const updatedData = {
    ...data,
    url: safeURL,
  };
  return safeURLPassThrough(fastify, request, updatedData);
};

export const safeURLPassThrough = <T extends K8sResourceCommon>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<T | K8sStatus> => {
  const { method, requestData, url } = data;

  return new Promise((resolve, reject) => {
    setupRequest(fastify, request, data).then((requestOptions) => {
      if (requestData) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': `application/${
            method === 'PATCH' ? 'json-patch+json' : 'json'
          };charset=UTF-8`,
          'Content-Length': requestData.length,
        };
      }

      fastify.log.info(`Making API ${method} request to ${url}`);

      const httpsRequest = https
        .request(url, requestOptions, (res) => {
          let data = '';
          res
            .setEncoding('utf8')
            .on('data', (chunk) => {
              data += chunk;
            })
            .on('end', () => {
              let parsedData: T | K8sStatus;
              try {
                parsedData = JSON.parse(data);
              } catch (e) {
                if (data.trim() === '404 page not found') {
                  // API on k8s doesn't exist, generate a status.
                  parsedData = {
                    kind: 'Status',
                    apiVersion: 'v1',
                    status: 'Failure',
                    message: data,
                    reason: 'NotFound',
                    code: 404,
                  };
                } else {
                  // Likely not JSON, print the error and return the content to the client
                  fastify.log.error(`Parsing response error: ${e}, ${data}`);
                  reject({ code: 500, response: data });
                  return;
                }
              }

              if (isK8sStatus(parsedData)) {
                if (parsedData.status !== 'Success') {
                  fastify.log.warn(
                    `Unsuccessful status Object, ${
                      DEV_MODE ? JSON.stringify(parsedData, null, 2) : JSON.stringify(parsedData)
                    }`,
                  );
                  reject({ code: parsedData.code, response: parsedData });
                  return;
                }
              }

              fastify.log.info('Successful request, returning data to caller.');
              resolve(parsedData);
            })
            .on('error', (error) => {
              if (error) {
                fastify.log.error(`Kube parsing response error: ${error}`);
                reject({ code: 500, response: error });
              }
            });
        })
        .on('error', (error) => {
          fastify.log.error(`Kube request error: ${error}`);
          reject({ code: 500, response: error });
        });

      if (requestData) {
        httpsRequest.write(requestData);
      }

      httpsRequest.end();
    });
  });
};
