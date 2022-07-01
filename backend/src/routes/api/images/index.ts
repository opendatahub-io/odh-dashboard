import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ImageType } from '../../../types';
import { postImage, deleteImage, getImageList, updateImage } from './imageUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    let labels = {};
    const params = request.params as { type: ImageType };
    if (params.type === 'byon') {
      labels = {
        'app.kubernetes.io/created-by': 'byon',
      };
    }
    // Additional types like: Other and Jupyter can be added to specify
    else {
      labels = {
        'opendatahub.io/notebook-image': 'true',
      };
    }
    return getImageList(fastify, labels)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.delete('/:image', async (request: FastifyRequest, reply: FastifyReply) => {
    return deleteImage(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.put('/:image', async (request: FastifyRequest, reply: FastifyReply) => {
    return updateImage(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return postImage(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
