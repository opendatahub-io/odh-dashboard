import { registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';

type ModuleFederationConfig = {
  name: string;
  remoteEntry: string;
  tls?: boolean;
  authorize?: boolean;
  proxy: {
    path: string;
    pathRewrite?: string;
  }[];
  local?: {
    host?: string;
    port?: number;
  };
  service: {
    name: string;
    namespace?: string;
    port: number;
  };
}[];

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  let mfConfig: ModuleFederationConfig | null = null;
  if (process.env.MODULE_FEDERATION_CONFIG) {
    try {
      mfConfig = JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    } catch (e) {
      fastify.log.error('Failed to parse module federation config', e);
    }
  }
  if (mfConfig && mfConfig.length > 0) {
    fastify.log.info(
      `Module federation configured for: ${mfConfig.map((mf) => mf.name).join(', ')}`,
    );
    mfConfig.forEach(({ name, proxy, local, service, tls: mfTls, authorize }) => {
      const getEnvVar = (prop: string): string | undefined =>
        process.env[`MF_${name.toLocaleUpperCase()}_${prop.toLocaleUpperCase()}`];

      const serviceName = getEnvVar('SERVICE_NAME') ?? service.name;
      const serviceNamespace = getEnvVar('SERVICE_NAMESPACE') ?? service.namespace;
      const servicePort = getEnvVar('SERVICE_PORT') ?? service.port;
      const host = getEnvVar('LOCAL_HOST') ?? local.host ?? 'localhost';
      const port = getEnvVar('LOCAL_PORT') ?? local.port;
      const tls = getEnvVar('TLS') ? getEnvVar('TLS') === 'true' : !!mfTls;

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
};
