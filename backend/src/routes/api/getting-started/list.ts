import { FastifyRequest } from 'fastify';
import { ODHGettingStarted } from '../../../types';
import { getGettingStartedDoc, getGettingStartedDocs } from './gettingStartedUtils';

export const listGettingStartedDocs = (
  request: FastifyRequest,
): Promise<ODHGettingStarted | ODHGettingStarted[]> => {
  const query = request.query as { [key: string]: string };
  if (query.appName) {
    return Promise.resolve(getGettingStartedDoc(query.appName));
  }
  // Fetch the installed quick starts
  return Promise.resolve(getGettingStartedDocs());
};
