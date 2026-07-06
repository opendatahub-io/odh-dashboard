import { KubeFastifyInstance, ODHSegmentKey } from '../../../types';
import { Buffer } from 'buffer';

export const getSegmentKey = async (fastify: KubeFastifyInstance): Promise<ODHSegmentKey> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  let segmentKeyEnabled = true;
  let decodedSegmentKey = '';
  try {
    const resEnabled = await coreV1Api.readNamespacedConfigMap('odh-segment-key-config', namespace);
    segmentKeyEnabled = resEnabled?.body.data?.segmentKeyEnabled === 'true';
    if (segmentKeyEnabled) {
      const res = await coreV1Api.readNamespacedSecret('odh-segment-key', namespace);
      decodedSegmentKey = String(Buffer.from(res.body.data.segmentKey, 'base64'));
    } else {
      decodedSegmentKey = '';
    }
    return {
      segmentKey: decodedSegmentKey,
    };
  } catch (e) {
    if (segmentKeyEnabled && e.response?.statusCode !== 404) {
      fastify.log.error('load segment key error: ' + e);
    }
    return {
      segmentKey: '',
    };
  }
};
