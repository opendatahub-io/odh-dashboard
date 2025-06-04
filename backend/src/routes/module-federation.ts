import * as fs from 'fs';
import * as path from 'path';
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
    // in DEV_MODE, read the module federation config from the package.json files
    return readModuleFederationConfigFromPackages(fastify);
  }
  return null;
};

const readModuleFederationConfigFromPackages = (
  fastify: KubeFastifyInstance,
): ModuleFederationConfig[] | null => {
  const packagesBasePath = path.resolve(__dirname, '../../../frontend/packages');
  const configs: ModuleFederationConfig[] = [];

  try {
    if (fs.existsSync(packagesBasePath)) {
      const packageFolders = fs
        .readdirSync(packagesBasePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const folderName of packageFolders) {
        const packageJsonPath = path.join(packagesBasePath, folderName, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            const federatedConfigProperty = packageJson['module-federation'];
            if (federatedConfigProperty) {
              configs.push(federatedConfigProperty);
            }
          } catch (e) {
            fastify.log.error(e, `Failed to read or parse ${packageJsonPath}: ${errorHandler(e)}`);
          }
        }
      }
    }
  } catch (e) {
    fastify.log.error(
      e,
      `Failed to read packages directory ${packagesBasePath} or process its contents for module feederation: ${errorHandler(
        e,
      )}`,
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
