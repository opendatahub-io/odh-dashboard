import { execFileSync, spawn, type ChildProcess } from 'child_process';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getModuleFederationConfigs, type ModuleFederationConfig } from '@odh-dashboard/app-config';
import { addDefaultCacheControl, registerProxy } from '../utils/proxy';
import { KubeFastifyInstance } from '../types';
import { DEV_MODE } from '../utils/constants';
import { errorHandler } from '../utils';

const startDevPortForwards = (
  fastify: KubeFastifyInstance,
  mfConfig: ModuleFederationConfig[],
): void => {
  let ocAvailable = true;
  try {
    execFileSync('oc', ['version', '--client'], { stdio: 'ignore' });
  } catch {
    fastify.log.warn('oc CLI not found, skipping auto port-forward for local services');
    ocAvailable = false;
  }
  if (!ocAvailable) {
    return;
  }

  const localServices = mfConfig.flatMap(({ proxyService }) =>
    (proxyService ?? []).filter((ps) => ps.localService),
  );

  if (localServices.length === 0) {
    return;
  }

  const activeChildren = new Map<string, ChildProcess>();
  let stopping = false;

  const cleanup = () => {
    stopping = true;
    activeChildren.forEach((child) => {
      try {
        child.kill();
      } catch {
        // already exited
      }
    });
  };
  process.on('exit', cleanup);
  process.once('SIGINT', () => {
    cleanup();
    process.kill(process.pid, 'SIGINT');
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.kill(process.pid, 'SIGTERM');
  });

  localServices.forEach((ps) => {
    const svcName = ps.service.name;
    const namespace = ps.service.namespace || process.env.OC_PROJECT || 'opendatahub';
    const localPort = ps.localService?.port ?? ps.service.port;
    const remotePort = ps.service.port;

    try {
      execFileSync('oc', ['get', 'svc', svcName, '-n', namespace], { stdio: 'ignore' });
    } catch {
      fastify.log.info(`Skipping port-forward: svc/${svcName} not found in ${namespace}`);
      return;
    }

    const startPortForward = () => {
      fastify.log.info(`Port-forwarding svc/${svcName} ${localPort}:${remotePort} -n ${namespace}`);
      const child = spawn(
        'oc',
        ['port-forward', `svc/${svcName}`, `${localPort}:${remotePort}`, '-n', namespace],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      activeChildren.set(svcName, child);
      child.stderr?.on('data', (data: Buffer) => {
        const msg = String(data).trim();
        fastify.log.warn(`[port-forward ${svcName}] ${msg}`);
      });
      child.on('error', (err) =>
        fastify.log.warn(`Port-forward for ${svcName} failed: ${err.message}`),
      );
      child.on('exit', (code) => {
        if (!stopping) {
          fastify.log.info(`Port-forward for ${svcName} dropped (code ${code}), restarting...`);
          setTimeout(() => !stopping && startPortForward(), 1000);
        }
      });
    };

    startPortForward();
  });
};

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

    if (DEV_MODE) {
      startDevPortForwards(fastify, mfConfig);
    }

    mfConfig.forEach(({ name, backend, proxyService }) => {
      if (backend) {
        registerProxy(fastify, {
          prefix: `/_mf/${name}`,
          rewritePrefix: ``,
          authorize: backend.authorize,
          tls: backend.tls,
          service: {
            ...backend.service,
            namespace: backend.service.namespace ?? process.env.OC_PROJECT,
          },
          local: backend.localService,
          headers: backend.headers,
          rewriteHeaders: addDefaultCacheControl,
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
      }

      proxyService?.forEach((proxy) => {
        registerProxy(fastify, {
          prefix: proxy.path,
          rewritePrefix: proxy.pathRewrite,
          authorize: proxy.authorize,
          tls: proxy.tls,
          service: {
            ...proxy.service,
            namespace: proxy.service.namespace ?? process.env.OC_PROJECT,
          },
          local: proxy.localService,
          headers: proxy.headers,
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
