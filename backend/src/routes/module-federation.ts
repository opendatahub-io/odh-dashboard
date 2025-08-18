import { execSync } from 'child_process';
import { registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

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
};

/**
 * Get all workspace packages using npm query from frontend directory
 * @returns {Array} Array of workspace package objects
 */
const getWorkspacePackages = (fastify: KubeFastifyInstance): any[] => {
  try {
    const stdout = execSync('npm query .workspace --json', {
      encoding: 'utf8',
    });
    return JSON.parse(stdout);
  } catch (error) {
    fastify.log.warn(`Error querying workspaces with npm query: ${errorHandler(error)}`);
    return [];
  }
};

const getModuleFederationConfig = (
  fastify: KubeFastifyInstance,
): ModuleFederationConfig[] | null => {
  if (process.env.MODULE_FEDERATION_CONFIG) {
    try {
      return JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    } catch (e) {
      fastify.log.error(e, `Failed to parse module federation config from ENV: ${errorHandler(e)}`);
    }
  } else if (DEV_MODE) {
    // in DEV_MODE, read the module federation config from workspace packages
    return readModuleFederationConfigFromPackages(fastify);
  }
  return null;
};

const readModuleFederationConfigFromPackages = (
  fastify: KubeFastifyInstance,
): ModuleFederationConfig[] | null => {
  const configs: ModuleFederationConfig[] = [];

  try {
    const workspacePackages = getWorkspacePackages(fastify);

    for (const pkg of workspacePackages) {
      const federatedConfigProperty = pkg['module-federation'];
      if (federatedConfigProperty) {
        configs.push(federatedConfigProperty);
      }
    }
  } catch (e) {
    fastify.log.error(
      e,
      `Failed to process workspace packages for module federation: ${errorHandler(e)}`,
    );
  }

  return configs;
};

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const mfConfig = getModuleFederationConfig(fastify);
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
};
