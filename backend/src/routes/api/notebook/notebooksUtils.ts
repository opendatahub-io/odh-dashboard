import { FastifyRequest } from 'fastify';
import createError from 'http-errors';
import {
  KubeFastifyInstance,
  Notebook,
  ImageStreamListKind,
  ImageStreamKind,
  NotebookStatus,
  PipelineRunListKind,
  PipelineRunKind,
  NotebookCreateRequest,
  NotebookUpdateRequest,
  NotebookPackage,
} from '../../../types';

const mapImageStreamToNotebook = (is: ImageStreamKind): Notebook => ({
  id: is.metadata.name,
  name: is.metadata.annotations['opendatahub.io/notebook-image-name'],
  description: is.metadata.annotations['opendatahub.io/notebook-image-desc'],
  phase: is.metadata.annotations['opendatahub.io/notebook-image-phase'] as NotebookStatus,
  visible: is.metadata.labels['opendatahub.io/notebook-image'] === 'true',
  error: is.metadata.annotations['opendatahub.io/notebook-image-messages']
    ? JSON.parse(is.metadata.annotations['opendatahub.io/notebook-image-messages'])
    : [],
  packages:
    is.spec.tags &&
    (JSON.parse(
      is.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'],
    ) as NotebookPackage[]),
  software:
    is.spec.tags &&
    (JSON.parse(
      is.spec.tags[0].annotations['opendatahub.io/notebook-software'],
    ) as NotebookPackage[]),
  uploaded: is.metadata.creationTimestamp,
  url: is.metadata.annotations['opendatahub.io/notebook-image-url'],
  user: is.metadata.annotations['opendatahub.io/notebook-image-creator'],
});

const mapPipelineRunToNotebook = (plr: PipelineRunKind): Notebook => ({
  id: plr.metadata.name,
  name: plr.spec.params.find((p) => p.name === 'name')?.value,
  description: plr.spec.params.find((p) => p.name === 'desc')?.value,
  url: plr.spec.params.find((p) => p.name === 'url')?.value,
  user: plr.spec.params.find((p) => p.name === 'creator')?.value,
  phase: 'Importing',
});

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
): Promise<{ notebooks: Notebook[]; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  try {
    const imageStreams = await customObjectsApi
      .listNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/created-by=byon',
      )
      .then((r) => r.body as ImageStreamListKind);
    const pipelineRuns = await customObjectsApi
      .listNamespacedCustomObject(
        'tekton.dev',
        'v1beta1',
        namespace,
        'pipelineruns',
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/created-by=byon',
      )
      .then((r) => r.body as PipelineRunListKind);

    const imageStreamNames = imageStreams.items.map((is) => is.metadata.name);
    const notebooks: Notebook[] = [
      ...imageStreams.items.map((is) => mapImageStreamToNotebook(is)),
      ...pipelineRuns.items
        .filter((plr) => !imageStreamNames.includes(plr.metadata.name))
        .map((plr) => mapPipelineRunToNotebook(plr)),
    ];

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
    const imageStream = await customObjectsApi
      .getNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.notebook,
      )
      .then((r) => r.body as ImageStreamKind)
      .catch((r) => null);

    if (imageStream) {
      return { notebooks: mapImageStreamToNotebook(imageStream), error: null };
    }

    const pipelineRun = await customObjectsApi
      .getNamespacedCustomObject(
        'tekton.dev',
        'v1beta1',
        namespace,
        'pipelineruns',
        params.notebook,
      )
      .then((r) => r.body as PipelineRunKind)
      .catch((r) => null);

    if (pipelineRun) {
      return { notebooks: mapPipelineRunToNotebook(pipelineRun), error: null };
    }

    throw new createError.NotFound(`Notebook ${params.notebook} does not exist.`);
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
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const body = request.body as NotebookCreateRequest;

  const payload: PipelineRunKind = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'PipelineRun',
    metadata: {
      generateName: 'byon-import-jupyterhub-image-run-',
    },
    spec: {
      params: [
        { name: 'desc', value: body.description },
        { name: 'name', value: body.name },
        { name: 'url', value: body.url },
        // FIXME: This shouldn't be a user defined value consumed from the request payload but should be a controlled value from an authentication middleware.
        { name: 'creator', value: body.user },
      ],
      pipelineRef: {
        name: 'byon-import-jupyterhub-image',
      },
      workspaces: [
        {
          name: 'data',
          volumeClaimTemplate: {
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: {
                requests: {
                  storage: '10Mi',
                },
              },
            },
          },
        },
      ],
    },
  };

  try {
    await customObjectsApi.createNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      namespace,
      'pipelineruns',
      payload,
    );
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
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const params = request.params as { notebook: string };

  try {
    await customObjectsApi
      .deleteNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.notebook,
      )
      .catch((e) => {
        throw createError(e.statusCode, e?.body?.message);
      });
    // Cleanup in case the pipelinerun is still present and was not garbage collected yet
    await customObjectsApi
      .deleteNamespacedCustomObject(
        'tekton.dev',
        'v1beta1',
        namespace,
        'pipelineruns',
        params.notebook,
      )
      .catch(() => {});
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to delete notebook image: ' + e.toString());
      return { success: false, error: 'Unable to delete notebook image: ' + e.message };
    }
  }
};

export const updateNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const params = request.params as { notebook: string };
  const body = request.body as NotebookUpdateRequest;

  try {
    const imageStream = await customObjectsApi
      .getNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.notebook,
      )
      .then((r) => r.body as ImageStreamKind)
      .catch((e) => {
        throw createError(e.statusCode, e?.body?.message);
      });

    if (body.packages && imageStream.spec.tags) {
      const packages = JSON.parse(
        imageStream.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'],
      ) as NotebookPackage[];

      body.packages.map((update) => {
        const original = packages.find((p) => p.name === update.name);
        if (original) {
          original.visible = update.visible;
        }
      });

      imageStream.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'] =
        JSON.stringify(packages);
    }
    if (typeof body.visible !== 'undefined') {
      if (body.visible) {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = 'true';
      } else {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = null;
      }
    }
    if (body.name) {
      imageStream.metadata.annotations['opendatahub.io/notebook-image-name'] = body.name;
    }
    if (body.description) {
      imageStream.metadata.annotations['opendatahub.io/notebook-image-desc'] = body.description;
    }

    await customObjectsApi
      .patchNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.notebook,
        imageStream,
        undefined,
        undefined,
        undefined,
        {
          headers: { 'Content-Type': 'application/merge-patch+json' },
        },
      )
      .catch((e) => console.log(e));

    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Unable to update notebook image: ' + e.toString());
      return { success: false, error: 'Unable to update notebook image: ' + e.message };
    }
  }
};
