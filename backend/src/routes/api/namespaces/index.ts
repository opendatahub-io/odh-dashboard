import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { applyNamespaceChange } from './namespaceUtils';
import { NamespaceApplicationCase } from './const';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:name/:context',
    async (request: OauthFastifyRequest<{ Params: { name: string; context: string } }>) => {
      const { name, context: contextAsString } = request.params;

      const context = parseInt(contextAsString) as NamespaceApplicationCase;

      return applyNamespaceChange(fastify, name, context);
    },
  );
};
