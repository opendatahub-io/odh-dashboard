import {
  K8sResourceCommon,
  K8sStatus,
  KubeFastifyInstance,
  OauthFastifyRequest,
} from '../../../types';
import { DEV_MODE } from '../../../utils/constants';
import { proxyCall, ProxyError, ProxyErrorType } from '../../../utils/httpUtils';

export type PassThroughData = {
  method: string;
  requestData: string;
  url: string;
};

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  (data as K8sStatus).kind === 'Status';

const passThroughCatch = (fastify: KubeFastifyInstance) => (error: Error) => {
  let errorMessage = 'Unknown error';
  if (error instanceof ProxyError) {
    errorMessage = error.message || errorMessage;
    switch (error.proxyErrorType) {
      case ProxyErrorType.CALL_FAILURE:
        fastify.log.error(`Kube parsing response error: ${errorMessage}`);
        throw { code: 500, response: error };
      case ProxyErrorType.HTTP_FAILURE:
        fastify.log.error(`Kube request error: ${errorMessage}`);
        throw { code: 500, response: error };
      default:
      // unhandled type, fall-through
    }
  } else if (!(error instanceof Error)) {
    errorMessage = JSON.stringify(error);
  }

  fastify.log.error(`Unhandled error during Kube call: ${errorMessage}`);
  throw error;
};

export const passThroughText = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<string> => {
  return (
    proxyCall(fastify, request, data)
      // TODO: is there bad text states that we want to error out on?
      .then(([rawData]) => rawData) // noop intentionally until above inquiry is figured out
      .catch(passThroughCatch(fastify))
  );
};

export const safePassThroughResource = <T extends K8sResourceCommon>(
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

  const updatedData: PassThroughData = {
    ...data,
    url: safeURL,
  };
  return passThroughResource(fastify, request, updatedData);
};

export const passThroughResource = <T extends K8sResourceCommon>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<T | K8sStatus> => {
  return proxyCall(fastify, request, data)
    .then(([rawData]) => {
      let parsedData: T | K8sStatus;

      try {
        parsedData = JSON.parse(rawData);
      } catch (e) {
        if (rawData.trim() === '404 page not found') {
          // API on k8s doesn't exist, generate a status.
          parsedData = {
            kind: 'Status',
            apiVersion: 'v1',
            status: 'Failure',
            message: rawData,
            reason: 'NotFound',
            code: 404,
          };
        } else {
          // Likely not JSON, print the error and return the content to the client
          fastify.log.error(`Parsing response error: ${e}, ${data}`);
          throw { code: 500, response: data };
        }
      }

      if (isK8sStatus(parsedData)) {
        if (parsedData.status !== 'Success') {
          fastify.log.warn(
            `Unsuccessful status Object, ${
              DEV_MODE ? JSON.stringify(parsedData, null, 2) : JSON.stringify(parsedData)
            }`,
          );
          throw { code: parsedData.code, response: parsedData };
        }
      }

      fastify.log.info('Successful request, returning data to caller.');
      return parsedData;
    })
    .catch(passThroughCatch(fastify));
};
