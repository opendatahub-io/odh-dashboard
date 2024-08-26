import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, StorageClassConfig } from '../../../types';
import { isHttpError } from '../../../utils';
import { errorHandler } from '../../../utils';

export async function updateStorageClassMetadata(
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Body: StorageClassConfig }>,
): Promise<{ success: boolean; error: string }> {
  const { namespace } = fastify.kube;
  const params = request.params as { storageClassName: string };
  const body = request.body as StorageClassConfig;

  try {
    // Fetch the existing custom object for the StorageClass
    const storageClass = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
      'storage.k8s.io',
      'v1',
      namespace,
      'storageclasses',
      params.storageClassName,
    );

    // Extract and update the annotations
    const annotations = (storageClass.body as any).metadata.annotations || {};
    annotations['opendatahub.io/sc-config'] = JSON.stringify(body);

    // Patch the StorageClass with the new annotations
    await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
      'storage.k8s.io',
      'v1',
      namespace,
      'storageclasses',
      params.storageClassName,
      {
        metadata: {
          annotations,
        },
      },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
      },
    );

    return { success: true, error: '' };
  } catch (e) {
    if (!isHttpError(e) || e.statusCode !== 404) {
      fastify.log.error(e, 'Unable to update storage class metadata.');
      return {
        success: false,
        error: `Unable to update storage class metadata: ${errorHandler(e)}`,
      };
    }
    throw e;
  }
}
