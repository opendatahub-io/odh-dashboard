import {
  K8sResourceCommon,
  K8sStatus,
  KubeFastifyInstance,
  OauthFastifyRequest,
} from '../../../types';
import { DEV_MODE } from '../../../utils/constants';
import { proxyCall, ProxyError, ProxyErrorType } from '../../../utils/httpUtils';

type PassThroughData = {
  method: string;
  requestData: string;
  url: string;
};

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  (data as K8sStatus).kind === 'Status';

export const passThrough = <T extends K8sResourceCommon>(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  data: PassThroughData,
): Promise<T | K8sStatus> => {
  return proxyCall(fastify, request, data)
    .then((rawData) => {
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
        } else if (data.method.toLowerCase() === 'delete') {
          // TODO: Remove when bug is fixed - https://issues.redhat.com/browse/RHCLOUD-28058
          // Return a non-status object upon successful delete
          return {} as K8sStatus;
        }
      }

      fastify.log.info('Successful request, returning data to caller.');
      return parsedData;
    })
    .catch((error) => {
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
    });
};
