import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, Notebook, ImageStreamListKind, ImageStreamKind, NotebookStatus, PipelineRunListKind, PipelineRunKind } from '../../../types';

const mapImageStreamToNotebook = (is: ImageStreamKind): Notebook => ({
  name: is.metadata.annotations["opendatahub.io/notebook-image-name"],
  description: is.metadata.annotations["opendatahub.io/notebook-image-name"],
  phase: is.metadata.annotations["opendatahub.io/notebook-image-phase"] as NotebookStatus,
  visible: is.metadata.annotations["opendatahub.io/notebook-image-visible"] === "true",
  error: Boolean(is.metadata.annotations["opendatahub.io/notebook-image-messages"])
    ? JSON.parse(is.metadata.annotations["opendatahub.io/notebook-image-messages"])
    : [],
  packages: is.spec.tags && JSON.parse(is.spec.tags[0].annotations["opendatahub.io/notebook-python-dependencies"]),
  uploaded: is.metadata.creationTimestamp,
  url: is.metadata.annotations["opendatahub.io/notebook-image-url"],
})

const mapPipelineRunToNotebook = (plr: PipelineRunKind): Notebook => ({
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
  const notebook: Notebook = {
    name: '',
    url: '',
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
