import { FastifyRequest } from 'fastify';
import { OdhDocument, KubeFastifyInstance } from '../../../types';
import { getDocs } from '../../../utils/resourceUtils';

export const listDocs = (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhDocument[]> => {
  // Fetch the installed quick starts
  let docs = getDocs();
  const query = request.query as { [key: string]: string };
  if (query.type) {
    docs = docs.filter((doc) => doc.spec.type === query.type);
  }

  return Promise.resolve(docs);
};
