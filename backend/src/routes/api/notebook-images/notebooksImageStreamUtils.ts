import { FastifyRequest } from 'fastify';
import createError from 'http-errors';
import {
  KubeFastifyInstance,
  NotebookImage,
  ImageStreamListKind,
  ImageStreamKind,
  NotebookImageStatus,
  NotebookImageCreateRequest,
  NotebookImageUpdateRequest,
  NotebookImagePackage,
} from '../../../types';

const packagesToString = (packages: NotebookImagePackage[]): string => {
  if (packages.length > 0) {
    let packageAsString = '[';
    packages.forEach((value, index) => {
      packageAsString = packageAsString + JSON.stringify(value);
      if (index !== packages.length - 1) {
        packageAsString = packageAsString + `,`;
      } else {
        packageAsString = packageAsString + ']';
      }
    });
    return packageAsString;
  }
  return '[]';
};
const mapImageStreamToNotebook = (is: ImageStreamKind): NotebookImage => ({
  id: is.metadata.name,
  name: is.metadata.annotations['opendatahub.io/notebook-image-name'],
  description: is.metadata.annotations['opendatahub.io/notebook-image-desc'],
  phase: is.metadata.annotations['opendatahub.io/notebook-image-phase'] as NotebookImageStatus,
  visible: is.metadata.labels['opendatahub.io/notebook-image'] === 'true',
  error: is.metadata.annotations['opendatahub.io/notebook-image-messages']
    ? JSON.parse(is.metadata.annotations['opendatahub.io/notebook-image-messages'])
    : [],
  packages:
    is.spec.tags &&
    (JSON.parse(
      is.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'],
    ) as NotebookImagePackage[]),
  software:
    is.spec.tags &&
    (JSON.parse(
      is.spec.tags[0].annotations['opendatahub.io/notebook-software'],
    ) as NotebookImagePackage[]),
  uploaded: is.metadata.creationTimestamp,
  url: is.metadata.annotations['opendatahub.io/notebook-image-url'],
  user: is.metadata.annotations['opendatahub.io/notebook-image-creator'],
});

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
): Promise<{ notebooks: NotebookImage[]; error: string }> => {
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

    const imageStreamNames = imageStreams.items.map((is) => {
      is.metadata.name;
    });
    const notebooks: NotebookImage[] = [
      ...imageStreams.items.map((is) => mapImageStreamToNotebook(is)),
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
): Promise<{ notebooks: NotebookImage; error: string }> => {
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

    throw new createError.NotFound(`NotebookImage ${params.notebook} does not exist.`);
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
  const body = request.body as NotebookImageCreateRequest;
  const imageTag = body.url.split(':')[1];

  const notebooks = await getNotebooks(fastify);
  const validName = notebooks.notebooks.filter((nb) => nb.name === body.name);

  if (validName.length > 0) {
    fastify.log.error('Duplicate name unable to add notebook image');
    return { success: false, error: 'Unable to add notebook image: ' + body.name };
  }

  const payload: ImageStreamKind = {
    kind: 'ImageStream',
    apiVersion: 'image.openshift.io/v1',
    metadata: {
      annotations: {
        'opendatahub.io/notebook-image-desc': body.description ? body.description : '',
        'opendatahub.io/notebook-image-name': body.name,
        'opendatahub.io/notebook-image-url': body.url,
        'opendatahub.io/notebook-image-creator': body.user,
        'opendatahub.io/notebook-image-phase': 'Succeeded',
        'opendatahub.io/notebook-image-origin': 'Admin',
        'opendatahub.io/notebook-image-messages': '',
      },
      name: `byon-${Date.now()}`,
      namespace: namespace,
      labels: {
        'app.kubernetes.io/created-by': 'byon',
        'opendatahub.io/notebook-image': 'true',
      },
    },
    spec: {
      lookupPolicy: {
        local: true,
      },
      tags: [
        {
          annotations: {
            'opendatahub.io/notebook-software': packagesToString(body.software),
            'opendatahub.io/notebook-python-dependencies': packagesToString(body.packages),
            'openshift.io/imported-from': body.url,
          },
          from: {
            kind: 'DockerImage',
            name: body.url,
          },
          name: imageTag,
        },
      ],
    },
  };

  try {
    await customObjectsApi.createNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      namespace,
      'imagestreams',
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
  const body = request.body as NotebookImageUpdateRequest;

  const notebooks = await getNotebooks(fastify);
  const validName = notebooks.notebooks.filter((nb) => nb.name === body.name && nb.id !== body.id);

  if (validName.length > 0) {
    fastify.log.error('Duplicate name unable to add notebook image');
    return { success: false, error: 'Unable to add notebook image: ' + body.name };
  }

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
      imageStream.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'] =
        JSON.stringify(body.packages);
    }

    if (body.software && imageStream.spec.tags) {
      imageStream.spec.tags[0].annotations['opendatahub.io/notebook-software'] = JSON.stringify(
        body.software,
      );
    }

    if (typeof body.visible !== undefined) {
      if (body.visible) {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = 'true';
      } else {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = 'false';
      }
    }
    if (body.name) {
      imageStream.metadata.annotations['opendatahub.io/notebook-image-name'] = body.name;
    }

    if (body.description !== undefined) {
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
