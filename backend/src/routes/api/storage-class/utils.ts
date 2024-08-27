import { FastifyRequest } from 'fastify';
import {
  K8sResourceCommon,
  KubeFastifyInstance,
  ResponseStatus,
  StorageClassConfig,
} from '../../../types';
import { isHttpError } from '../../../utils';
import { errorHandler } from '../../../utils';

export async function updateStorageClassConfig(
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Body: StorageClassConfig; Params: { storageClassName: string } }>,
): Promise<ResponseStatus> {
  const params = request.params;
  const body = request.body;

  try {
    // Fetch the existing custom object for the StorageClass
    const storageClass = await fastify.kube.customObjectsApi.getClusterCustomObject(
      'storage.k8s.io',
      'v1',
      'storageclasses',
      params.storageClassName,
    );

    // Extract and update the annotations
    const annotations = (storageClass.body as K8sResourceCommon).metadata.annotations || {};
    annotations['opendatahub.io/sc-config'] = JSON.stringify(body);

    // Patch the StorageClass with the new annotations
    await fastify.kube.customObjectsApi.patchClusterCustomObject(
      'storage.k8s.io',
      'v1',
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
