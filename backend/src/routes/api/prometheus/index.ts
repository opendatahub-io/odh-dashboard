import { KubeFastifyInstance, OauthFastifyRequest, PrometheusResponse } from '../../../types';
import { callPrometheus } from '../../../utils/prometheusUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  /**
   * Pass through API for getting information out of prometheus.
   * Acts on the user who made the call -- does not need route security; k8s provides that.
   */
  fastify.post(
    '/',
    async (
      request: OauthFastifyRequest<{ Body: { query: string; namespace: string } }>,
    ): Promise<{ code: number; response: PrometheusResponse }> => {
      logRequestDetails(fastify, request);

      const { query, namespace } = request.body;

      return callPrometheus(fastify, request, query, namespace).catch((e) => {
        if (e?.code) {
          throw createCustomError(
            'Error with prometheus call',
            e.response || 'Prometheus call error',
            e.code,
          );
        }
        throw e;
      });
    },
  );
};
