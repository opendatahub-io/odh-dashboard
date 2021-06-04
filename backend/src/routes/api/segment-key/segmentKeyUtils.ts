import { KubeFastifyInstance, ODHSegmentKey } from '../../../types';

export const getSegmentKey = async (fastify: KubeFastifyInstance): Promise<ODHSegmentKey> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  try {
    const res = await coreV1Api.readNamespacedSecret('rhods-segment-key', namespace);
    const decodedSegmentKey = Buffer.from(res.body.data.segmentKey, 'base64').toString();
    return {
      segmentKey: decodedSegmentKey,
    };
  } catch (e) {
    fastify.log.error('load segment key error: ' + e);
    return {
      segmentKey: '',
    };
  }
};
