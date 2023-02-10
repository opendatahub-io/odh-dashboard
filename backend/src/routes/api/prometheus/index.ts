import createError from 'http-errors';
import {
  KubeFastifyInstance,
  OauthFastifyRequest,
  PrometheusQueryRangeResponse,
  PrometheusQueryResponse,
} from '../../../types';
import { callPrometheusPVC, callPrometheusServing } from '../../../utils/prometheusUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

const handleError = (e: createError.HttpError) => {
  if (e?.code) {
    throw createCustomError(
      'Error with prometheus call',
      e.response || 'Prometheus call error',
      e.code,
    );
  }
  throw e;
};

/**
 * Pass through API for getting information out of prometheus.
 * Acts on the user who made the call -- does not need route security; k8s provides that.
 */

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.post(
    '/pvc',
    async (
      request: OauthFastifyRequest<{
        Body: { query: string };
      }>,
    ): Promise<{ code: number; response: PrometheusQueryResponse }> => {
      const { query } = request.body;

      return callPrometheusPVC(fastify, request, query).catch(handleError);
    },
  );

  fastify.post(
    '/serving',
    async (
      request: OauthFastifyRequest<{
        Body: { query: string };
      }>,
    ): Promise<{ code: number; response: PrometheusQueryRangeResponse }> => {
      logRequestDetails(fastify, request);
      const { query } = request.body;

      return callPrometheusServing(fastify, request, query).catch(handleError);
    },
  );
};
