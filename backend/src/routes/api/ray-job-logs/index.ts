import stream from 'stream';
import * as k8s from '@kubernetes/client-node';
import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { DEV_MODE, USER_ACCESS_TOKEN } from '../../../utils/constants';
import { isImpersonating, getImpersonateAccessToken } from '../../../devFlags';

const RAY_LOG_BASE_PATH = '/tmp/ray/session_latest/logs';
const SAFE_PARAM = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Build a KubeConfig that authenticates as the requesting user rather than
 * the dashboard service-account. This is required so that exec honours the
 * user's RBAC permissions.
 */
const buildUserKubeConfig = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
): k8s.KubeConfig => {
  const baseKc = fastify.kube.config;
  const cluster = baseKc.getCurrentCluster();
  if (!cluster) {
    throw new Error('No current cluster configured');
  }

  let token: string;
  if (DEV_MODE) {
    token = isImpersonating() ? getImpersonateAccessToken() : baseKc.getCurrentUser()?.token ?? '';
  } else {
    const accessToken = request.headers[USER_ACCESS_TOKEN];
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('No access token provided by oauth. Cannot exec into pod.');
    }
    token = accessToken;
  }

  const userKc = new k8s.KubeConfig();
  userKc.loadFromClusterAndUser(cluster, { name: 'user', token });
  return userKc;
};

const toError = (err: unknown): Error => {
  if (err instanceof Error) {
    return err;
  }
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Unknown error');
  }
};

/**
 * Exec a command inside a pod and collect stdout/stderr as strings.
 *
 * Always resolves when the command finishes (regardless of exit code).
 * Only rejects on connection-level failures (pod not found, no
 * permission, network error).
 */
const execInPod = (
  kc: k8s.KubeConfig,
  namespace: string,
  podName: string,
  containerName: string,
  command: string[],
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const doResolve = () => {
      if (!settled) {
        settled = true;
        resolve({ stdout, stderr });
      }
    };

    const doReject = (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const stdoutStream = new stream.Writable({
      write(chunk: Buffer, _encoding, callback) {
        stdout += String(chunk);
        callback();
      },
    });

    const stderrStream = new stream.Writable({
      write(chunk: Buffer, _encoding, callback) {
        stderr += String(chunk);
        callback();
      },
    });

    const exec = new k8s.Exec(kc);

    exec
      .exec(
        namespace,
        podName,
        containerName,
        command,
        stdoutStream,
        stderrStream,
        null,
        false,
        () => {
          doResolve();
        },
      )
      .then((ws) => {
        ws.on('error', (err: unknown) => {
          doReject(toError(err));
        });
        ws.on('close', () => {
          doResolve();
        });
      })
      .catch((err: unknown) => {
        doReject(toError(err));
      });
  });

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:podName/:containerName/:jobId',
    async (
      request: OauthFastifyRequest<{
        Params: {
          namespace: string;
          podName: string;
          containerName: string;
          jobId: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, podName, containerName, jobId } = request.params;

      if (!SAFE_PARAM.test(jobId)) {
        reply.code(400).send({ error: 'Invalid jobId' });
        return;
      }

      const filePath = `${RAY_LOG_BASE_PATH}/job-driver-${jobId}.log`;

      fastify.log.info(`Reading Ray job logs: ${namespace}/${podName}/${containerName} - ${jobId}`);

      try {
        const userKc = buildUserKubeConfig(fastify, request);
        const { stdout, stderr } = await execInPod(userKc, namespace, podName, containerName, [
          'cat',
          filePath,
        ]);

        if (!stdout && stderr) {
          reply.code(500).send({ error: 'Failed to read logs', details: stderr.trim() });
          return;
        }

        reply.type('text/plain').send(stdout);
      } catch (error: unknown) {
        const err = toError(error);
        fastify.log.error(err, `Failed to exec into pod ${podName}`);
        reply.code(500).send({ error: 'Failed to read logs', details: err.message });
      }
    },
  );
};
