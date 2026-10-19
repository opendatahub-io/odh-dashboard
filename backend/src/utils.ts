import { FastifyInstance } from 'fastify';
import { KubeFastifyInstance } from './types';
import { K8sApiError, isK8sApiError } from './utils/k8sApiError';

export const isHttpError = (e: unknown): e is K8sApiError => isK8sApiError(e);

export const errorHandler = (e: unknown): string => {
  if (typeof e === 'object' && !!e) {
    if (
      'response' in e &&
      !!e.response &&
      typeof e.response === 'object' &&
      'body' in e.response &&
      !!e.response.body &&
      typeof e.response.body === 'object' &&
      'message' in e.response.body &&
      !!e.response.body.message &&
      typeof e.response.body.message === 'string'
    ) {
      return e.response.body.message;
    }
    if (e instanceof Error) {
      return e.message;
    }
  }
  return '';
};

export const isKubeFastifyInstance = (obj: FastifyInstance): obj is KubeFastifyInstance =>
  'kube' in obj;
