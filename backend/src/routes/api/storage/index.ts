import { FastifyInstance, FastifyReply } from 'fastify';
import { getObjectSize, getObjectStream, setupMinioClient } from './storageUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { getDirectCallOptions } from '../../../utils/directCallUtils';
import { getAccessToken } from '../../../utils/directCallUtils';
import { OauthFastifyRequest } from '../../../types';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/size',
    async (
      request: OauthFastifyRequest<{
        Querystring: { key: string };
        Params: { namespace: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const dashConfig = getDashboardConfig();
        if (dashConfig?.spec.dashboardConfig.disableS3Endpoint !== false) {
          reply.code(404).send('Not found');
          return reply;
        }

        const { namespace } = request.params;
        const { key } = request.query;

        const requestOptions = await getDirectCallOptions(fastify, request, request.url);
        const token = getAccessToken(requestOptions);

        const { client, bucket } = await setupMinioClient(fastify, token, namespace);

        const size = await getObjectSize({
          client,
          key,
          bucket,
        });

        reply.send(size);
      } catch (err) {
        reply.code(500).send(err.message);
        return reply;
      }
    },
  );

  fastify.get(
    '/:namespace',
    async (
      request: OauthFastifyRequest<{
        Querystring: { key: string; peek?: number };
        Params: { namespace: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const dashConfig = getDashboardConfig();
        if (dashConfig?.spec.dashboardConfig.disableS3Endpoint !== false) {
          reply.code(404).send('Not found');
          return reply;
        }

        const { namespace } = request.params;
        const { key, peek } = request.query;

        const requestOptions = await getDirectCallOptions(fastify, request, request.url);
        const token = getAccessToken(requestOptions);

        const { client, bucket } = await setupMinioClient(fastify, token, namespace);

        const stream = await getObjectStream({
          client,
          key,
          bucket,
          peek,
        });

        reply.type('text/plain');

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk) => {
            reply.raw.write(chunk);
          });

          stream.on('end', () => {
            reply.raw.end();
            resolve();
          });

          stream.on('error', (err) => {
            fastify.log.error('Stream error:', err);
            reply.raw.statusCode = 500;
            reply.raw.end(err.message);
            reject(err);
          });
        });

        return;
      } catch (err) {
        reply.code(500).send(err.message);
        return reply;
      }
    },
  );
};
