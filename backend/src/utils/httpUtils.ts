import https from 'https';
import http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';
import { getDirectCallOptions } from './directCallUtils';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { DEV_MODE } from './constants';

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
  requestData?: string | Buffer;
  /** Option to substitute your own content type for the API call -- defaults to JSON */
  overrideContentType?: string;
  /** Option to set the Accept header for the outgoing API call */
  overrideAccept?: string;
};

/** Ideally these would all be required, but https by node seems to think there are cases when it does not know the code or message */
export type ProxyCallStatus = {
  message?: string;
  code?: number;
};

export const getProxyAgent = (targetUrl: string): HttpsProxyAgent<string> | undefined => {
  if (!targetUrl.startsWith('https:')) {
    return undefined;
  }

  const proxyUrl = getProxyForUrl(targetUrl);
  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
};

/** Make a very basic pass-on / proxy call to another endpoint */
export const proxyCall = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: ProxyData,
): Promise<[string, ProxyCallStatus]> => {
  return new Promise((resolve, reject) => {
    const { method, requestData, overrideContentType, overrideAccept, url } = data;

    getDirectCallOptions(fastify, request, url)
      .then((requestOptions) => {
        if (overrideAccept) {
          requestOptions.headers = {
            ...requestOptions.headers,
            Accept: overrideAccept,
          };
        }

        if (requestData) {
          let contentType: string;
          if (overrideContentType) {
            contentType = overrideContentType;
          } else {
            contentType = `application/${
              method === 'PATCH' ? 'json-patch+json' : 'json'
            };charset=UTF-8`;
          }

          requestOptions.headers = {
            ...requestOptions.headers,
            'Content-Type': contentType,
            'Content-Length': String(Buffer.byteLength(requestData, 'utf8')),
          };
        }

        fastify.log.info(`Making ${method} proxy request to ${url}`);

        const web = (url: string) => {
          if (url.startsWith('http:')) {
            if (!DEV_MODE) {
              throw new ProxyError(
                ProxyErrorType.SETUP_FAILURE,
                'Insecure HTTP requests are prohibited when not in development mode.',
              );
            }
            return http;
          }
          return https;
        };

        const agent = getProxyAgent(url);
        const reqOpts: Record<string, unknown> = { method, ...requestOptions };
        if (agent) {
          reqOpts.agent = agent;
        }

        const httpsRequest = web(url)
          .request(url, reqOpts, (res) => {
            const status: ProxyCallStatus = {
              message: res.statusMessage,
              code: res.statusCode,
            };
            let data = '';
            res
              .setEncoding('utf8')
              .on('data', (chunk) => {
                data += chunk;
              })
              .on('end', () => {
                resolve([data, status]);
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
