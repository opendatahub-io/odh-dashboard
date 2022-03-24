import { FastifyRequest } from 'fastify';
import createError from 'http-errors';
import { KubeFastifyInstance, Notebook, ImageStreamListKind, ImageStreamKind, NotebookStatus, PipelineRunListKind, PipelineRunKind } from '../../../types';

const mapImageStreamToNotebook = (is: ImageStreamKind): Notebook => ({
  id: is.metadata.name,
  name: is.metadata.annotations["opendatahub.io/notebook-image-name"],
  description: is.metadata.annotations["opendatahub.io/notebook-image-name"],
  phase: is.metadata.annotations["opendatahub.io/notebook-image-phase"] as NotebookStatus,
  visible: is.metadata.annotations["opendatahub.io/notebook-image-visible"] === "true",
  error: Boolean(is.metadata.annotations["opendatahub.io/notebook-image-messages"])
    ? JSON.parse(is.metadata.annotations["opendatahub.io/notebook-image-messages"])
    : [],
  packages: is.spec.tags && JSON.parse(is.spec.tags[0].annotations["opendatahub.io/notebook-python-dependencies"]),
  software: is.spec.tags && JSON.parse(is.spec.tags[0].annotations["opendatahub.io/notebook-software"]),
  uploaded: is.metadata.creationTimestamp,
  url: is.metadata.annotations["opendatahub.io/notebook-image-url"],
})

const mapPipelineRunToNotebook = (plr: PipelineRunKind): Notebook => ({
  id: plr.metadata.name,
  name: plr.spec.params.find(p => p.name === "name")?.value,
  description: plr.spec.params.find(p => p.name === "desc")?.value,
  url: plr.spec.params.find(p => p.name === "url")?.value,
  phase: "Importing",
})

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
): Promise<{ notebooks: Notebook[]; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  try {
    const imageStreams = await customObjectsApi.listNamespacedCustomObject(
      "image.openshift.io",
      "v1",
      namespace,
      "imagestreams",
      undefined, undefined, undefined,
      "app.kubernetes.io/created-by=byon"
    ).then(r => r.body as ImageStreamListKind)
    const pipelineRuns = await customObjectsApi.listNamespacedCustomObject(
      "tekton.dev",
      "v1beta1",
      namespace,
      "pipelineruns",
      undefined, undefined, undefined,
      "app.kubernetes.io/created-by=byon"
    ).then(r => r.body as PipelineRunListKind)

    const imageStreamNames = imageStreams.items.map(is => is.metadata.name)
    const notebooks: Notebook[] = [
      ...imageStreams.items.map(is => mapImageStreamToNotebook(is)),
      ...pipelineRuns.items.filter(plr => !imageStreamNames.includes(plr.metadata.name)).map(plr => mapPipelineRunToNotebook(plr)),
    ]

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
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const params = request.params as { notebook: string };

  try {
    const imageStream = await customObjectsApi.getNamespacedCustomObject(
      "image.openshift.io",
      "v1",
      namespace,
      "imagestreams",
      params.notebook
    ).then(r => r.body as ImageStreamKind).catch(r => null)

    if (imageStream) {
      return { notebooks: mapImageStreamToNotebook(imageStream), error: null };
    }

    const pipelineRun = await customObjectsApi.getNamespacedCustomObject(
      "tekton.dev",
      "v1beta1",
      namespace,
      "pipelineruns",
      params.notebook
    ).then(r => r.body as PipelineRunKind).catch(r => null)

    if (pipelineRun) {
      return { notebooks: mapPipelineRunToNotebook(pipelineRun), error: null };
    }

    throw new createError.NotFound(`Notebook ${params.notebook} does not exist.`)
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
