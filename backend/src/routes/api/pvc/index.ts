import { KubeFastifyInstance, PersistentVolumeClaimKind } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { createPVC, getPVC } from './pvcUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/:pvcName', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as {
      pvcName: string;
    };
    return getPVC(fastify, params.pvcName)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const pvcData = request.body as PersistentVolumeClaimKind;
    return createPVC(fastify, pvcData)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.delete('/:pvcName', async (request: FastifyRequest, reply: FastifyReply) => {
    const namespace = fastify.kube.namespace;
    const params = request.params as {
      pvcName: string;
    };
    return fastify.kube.coreV1Api
      .deleteNamespacedPersistentVolumeClaim(params.pvcName, namespace)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
