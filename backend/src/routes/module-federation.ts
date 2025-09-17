import {
  getModuleFederationConfigs,
  MF_PATH_PREFIX,
  ModuleFederationConfig,
  getModuleFederationURL,
} from '@odh-dashboard/app-config/node';
import { registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

const safeGetModuleFederationConfigs = (
  fastify: KubeFastifyInstance,
): ModuleFederationConfig[] | null => {
  try {
    return getModuleFederationConfigs(DEV_MODE);
  } catch (e) {
    fastify.log.error(e, `Failed to parse module federation config from ENV: ${errorHandler(e)}`);
  }
};

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const mfConfigs = safeGetModuleFederationConfigs(fastify);
  if (mfConfigs && mfConfigs.length > 0) {
    fastify.log.info(
      `Module federation configured for: ${mfConfigs.map((mf) => mf.name).join(', ')}`,
    );
    mfConfigs.forEach((mfConfig) => {
      const { name, proxy, authorize } = mfConfig;
      const url = getModuleFederationURL(mfConfig)[DEV_MODE ? 'local' : 'remote'];
      registerProxy(fastify, {
        prefix: `${MF_PATH_PREFIX}/${name}`,
        rewritePrefix: ``,
        authorize,
        url,
        onError: (reply, error) => {
          if (
            'code' in error.error &&
            error.error.code === 'FST_REPLY_FROM_INTERNAL_SERVER_ERROR' &&
            'statusCode' in error.error &&
            error.error.statusCode === 500
          ) {
            fastify.log.error(`Module federation service '${name}' is unavailable`);
            // Respond with 503 Service Unavailable instead of 500
            reply.code(503).send({
              error: 'Service Unavailable',
              message: `Module federation service '${name}' is currently unavailable`,
              statusCode: 503,
            });
          } else {
            reply.send(error);
          }
        },
      });
      proxy.forEach((proxy) => {
        registerProxy(fastify, {
          prefix: proxy.path,
          rewritePrefix: proxy.pathRewrite ?? proxy.path,
          authorize,
          url,
        });
      });
    });
  } else {
    fastify.log.info(`Module federation is not configured`);
  }
};
