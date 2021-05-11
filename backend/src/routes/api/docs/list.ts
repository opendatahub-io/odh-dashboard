import { FastifyRequest } from 'fastify';
import { ODHDoc } from '../../../types';
import { KubeFastifyInstance } from '../../../types';
import { getDocs } from '../../../utils/resourceUtils';

export const listDocs = (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<ODHDoc[]> => {
  // Fetch the installed quick starts
  let docs = getDocs();
  const query = request.query as { [key: string]: string };
  if (query.type) {
    docs = docs.filter((doc) => doc.metadata.type === query.type);
  }

  return Promise.resolve(docs);
};
