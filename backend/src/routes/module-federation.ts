import { FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs, type ModuleFederationConfig } from '@odh-dashboard/app-config';
import { registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  let mfConfig: ModuleFederationConfig[] = [];
  try {
    mfConfig = getModuleFederationConfigs(DEV_MODE);
  } catch (e) {
    fastify.log.error(e, errorHandler(e));
  }
  if (mfConfig && mfConfig.length > 0) {
    fastify.log.info(
      `Module federation configured for: ${mfConfig.map((mf) => mf.name).join(', ')}`,
    );
    mfConfig.forEach(({ name, proxy, local, service, tls: mfTls, authorize }) => {
      const getEnvVar = (prop: string): string | undefined =>
        process.env[`MF_${name.toLocaleUpperCase()}_${prop.toLocaleUpperCase()}`];

      const serviceName = getEnvVar('SERVICE_NAME') ?? service.name;
      const serviceNamespace =
        getEnvVar('SERVICE_NAMESPACE') ?? service.namespace ?? process.env.OC_PROJECT;
      const servicePort = getEnvVar('SERVICE_PORT') ?? service.port;
      const host = getEnvVar('LOCAL_HOST') ?? local?.host ?? 'localhost';
      const port = getEnvVar('LOCAL_PORT') ?? local?.port;
      const tls = getEnvVar('TLS') ? getEnvVar('TLS') === 'true' : mfTls ?? true;

      registerProxy(fastify, {
        prefix: `/_mf/${name}`,
        rewritePrefix: ``,
        tls,
        authorize,
        service: {
          name: serviceName,
          namespace: serviceNamespace,
          port: servicePort,
        },
        local: {
          host,
          port,
        },
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
          tls,
          authorize,
          service: {
            name: serviceName,
            namespace: serviceNamespace,
            port: servicePort,
          },
          local: {
            host,
            port,
          },
        });
      });
    });
  } else {
    fastify.log.info(`Module federation is not configured`);
  }

  // Fallback to 404 for all module federation requests.
  fastify.get('/_mf/*', async (_: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send();
    return reply;
  });
};
