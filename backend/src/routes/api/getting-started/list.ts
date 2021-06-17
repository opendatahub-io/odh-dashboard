import { FastifyRequest } from 'fastify';
import { OdhGettingStarted } from '../../../types';
import { getGettingStartedDoc, getGettingStartedDocs } from './gettingStartedUtils';

export const listGettingStartedDocs = (request: FastifyRequest): Promise<OdhGettingStarted[]> => {
  const query = request.query as { [key: string]: string };
  if (query.appName) {
    return Promise.resolve(getGettingStartedDoc(query.appName));
  }
  // Fetch the installed quick starts
  return Promise.resolve(getGettingStartedDocs());
};
