import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { proxyCall } from '../../../utils/httpUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.post(
    '/*',
    (
      req: OauthFastifyRequest<{
        Params: { '*': string };
        Body: {
          method: string;
          host: string;
          data: Record<string, unknown>;
          queryParams: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      logRequestDetails(fastify, req);

      const { method, host, data, queryParams } = req.body;
      const requestData = JSON.stringify(data);

      const queryParamString = Object.keys(queryParams)
        .filter((key) => queryParams[key] !== undefined)
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');

      const path = req.params['*'];
      const url = `${host}/${path}${queryParamString ? `?${queryParamString}` : ''}`;

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
