import { registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';

type ModuleFederationConfig = {
  name: string;
  remoteEntry: string;
  proxy: {
    path: string;
    pathRewrite?: string;
    authorize?: boolean;
  }[];
  local: {
    host?: string;
    port: number;
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
  if (mfConfig) {
    mfConfig.forEach(({ name, proxy, local, service }) => {
      const getEnvVar = (prop: string): string | undefined =>
        process.env[`MF_${name.toLocaleUpperCase()}_${prop.toLocaleUpperCase()}`];

      const serviceName = getEnvVar('SERVICE_NAME') ?? service.name;
      const serviceNamespace = getEnvVar('SERVICE_NAMESPACE') ?? service.namespace;
      const servicePort = getEnvVar('SERVICE_PORT') ?? service.port;
      const host = getEnvVar('LOCAL_HOST') ?? local.host ?? 'localhost';
      const port = getEnvVar('LOCAL_PORT') ?? local.port;

      registerProxy(fastify, {
        prefix: `/_mf/${name}`,
        rewritePrefix: ``,
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
          authorize: proxy.authorize,
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
  }
};
