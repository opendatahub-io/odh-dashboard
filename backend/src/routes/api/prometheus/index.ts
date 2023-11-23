import createError from 'http-errors';
import {
  KubeFastifyInstance,
  OauthFastifyRequest,
  PrometheusQueryRangeResponse,
  PrometheusQueryResponse,
  QueryType,
} from '../../../types';
import { callPrometheusThanos } from '../../../utils/prometheusUtils';
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

      return callPrometheusThanos<PrometheusQueryResponse>(fastify, request, query).catch(
        handleError,
      );
    },
  );

  fastify.post(
    '/bias',
    async (
      request: OauthFastifyRequest<{
        Body: { query: string };
      }>,
    ): Promise<{ code: number; response: PrometheusQueryRangeResponse }> => {
      const { query } = request.body;

      return callPrometheusThanos<PrometheusQueryRangeResponse>(
        fastify,
        request,
        query,
        QueryType.QUERY_RANGE,
      ).catch(handleError);
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

      return callPrometheusThanos<PrometheusQueryRangeResponse>(
        fastify,
        request,
        query,
        QueryType.QUERY_RANGE,
      ).catch(handleError);
    },
  );
};
