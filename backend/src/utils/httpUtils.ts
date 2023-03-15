import https from 'https';
import { getDirectCallOptions } from './directCallUtils';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';

export enum ProxyErrorType {
  /** Failed during startup */
  SETUP_FAILURE,
  /** Failed at the http call level */
  HTTP_FAILURE,
  /** Failed after the connection was made but the request terminated before finishing */
  CALL_FAILURE,
}

export class ProxyError extends Error {
  public proxyErrorType: ProxyErrorType;

  constructor(type: ProxyErrorType, message: string) {
    super(message);

    this.proxyErrorType = type;
  }
}

type ProxyData = {
  method: string;
  url: string;
  requestData?: string;
};

/** Make a very basic pass-on / proxy call to another endpoint */
export const proxyCall = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: ProxyData,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { method, requestData, url } = data;

    getDirectCallOptions(fastify, request, url)
      .then((requestOptions) => {
        if (requestData) {
          requestOptions.headers = {
            ...requestOptions.headers,
            'Content-Type': `application/${
              method === 'PATCH' ? 'json-patch+json' : 'json'
            };charset=UTF-8`,
            'Content-Length': requestData.length,
          };
        }

        fastify.log.info(`Making ${method} proxy request to ${url}`);

        const httpsRequest = https
          .request(url, { method, ...requestOptions }, (res) => {
            let data = '';
            res
              .setEncoding('utf8')
              .on('data', (chunk) => {
                data += chunk;
              })
              .on('end', () => {
                resolve(data);
              })
              .on('error', (error) => {
                reject(new ProxyError(ProxyErrorType.CALL_FAILURE, error.message));
              });
          })
          .on('error', (error) => {
            reject(new ProxyError(ProxyErrorType.HTTP_FAILURE, error.message));
          });

        if (requestData) {
          httpsRequest.write(requestData);
        }

        httpsRequest.end();
      })
      .catch((error) => {
        reject(new ProxyError(ProxyErrorType.SETUP_FAILURE, error.message));
      });
  });
};
