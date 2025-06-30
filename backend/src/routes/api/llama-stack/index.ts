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

    try {
      const stream = await client.inference.chatCompletion({
        messages: messages,
        model_id,
        stream: true,
      });

      for await (const inferenceChatCompletionResponse of stream) {
        if ('text' in inferenceChatCompletionResponse.event.delta) {
          const text = inferenceChatCompletionResponse.event.delta.text;
          console.log('text', text);
          if (text) {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      }

      // Send end of stream
      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    } catch (error) {
      console.error('Streaming error:', error);
      reply.raw.write(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`);
      reply.raw.end();
    }
  });
};
