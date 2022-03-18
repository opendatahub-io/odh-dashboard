import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, Notebook } from '../../../types';

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
): Promise<{ notebooks: Notebook[]; error: string }> => {
  const notebooks: Notebook[] = [];
  // const coreV1Api = fastify.kube.coreV1Api;
  // const namespace = fastify.kube.namespace;
  try {
    return { notebooks: notebooks, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to retrieve notebook image(s): ' + e.toString());
      return { notebooks: null, error: 'Unable to retrieve notebook image(s): ' + e.message };
    }
  }
};

export const getNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ notebooks: Notebook; error: string }> => {
  const notebook: Notebook = {
    name: '',
    repo: '',
  };
  // const coreV1Api = fastify.kube.coreV1Api;
  // const namespace = fastify.kube.namespace;
  try {
    return { notebooks: notebook, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to retrieve notebook image(s): ' + e.toString());
      return { notebooks: null, error: 'Unable to retrieve notebook image(s): ' + e.message };
    }
  }
};

export const addNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  // const coreV1Api = fastify.kube.coreV1Api;
  // const namespace = fastify.kube.namespace;
  try {
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to add notebook image: ' + e.toString());
      return { success: false, error: 'Unable to add notebook image: ' + e.message };
    }
  }
};

export const deleteNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  // const coreV1Api = fastify.kube.coreV1Api;
  // const namespace = fastify.kube.namespace;
  try {
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to update notebook image: ' + e.toString());
      return { success: false, error: 'Unable to update notebook image: ' + e.message };
    }
  }
};

export const updateNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  // const coreV1Api = fastify.kube.coreV1Api;
  // const namespace = fastify.kube.namespace;
  try {
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to update notebook image: ' + e.toString());
      return { success: false, error: 'Unable to update notebook image: ' + e.message };
    }
  }
};
