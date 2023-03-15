import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { proxyCall } from '../../../utils/httpUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.post(
    '/',
    (
      req: OauthFastifyRequest<{
        // Querystring: Record<string, string>; // TODO
        Body: {
          method: string;
          url: string;
          data: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      logRequestDetails(fastify, req);

      const { method, url, data } = req.body;
      const requestData = JSON.stringify(data);

      return proxyCall(fastify, req, { method, url, requestData }).catch((error) => {
        if (error.code && error.response) {
          const { code, response } = error;
          reply.code(code);
          reply.send(response);
        } else {
          throw error;
        }
      });
    },
  );
};
