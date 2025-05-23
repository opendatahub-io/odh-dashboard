import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { LlamaStackClient } from 'llama-stack-client';

module.exports = async (fastify: KubeFastifyInstance) => {
  const client = new LlamaStackClient({
    baseURL: 'http://localhost:8321',
  });

  fastify.get('/models/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const models = await client.models.list();
    reply.send(models);
  });

  fastify.post('/chat/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { messages: any[]; model_id: string };
    const { messages, model_id } = body;

    const response = await client.inference.chatCompletion({
      model_id,
      messages: messages,
    });

    reply.send(response);
  });
};
