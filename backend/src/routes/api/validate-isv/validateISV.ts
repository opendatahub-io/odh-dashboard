import createError from 'http-errors';
import { IncomingMessage } from 'http';
import { CoreV1Api, V1Secret } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplicationDef } from '../../../utils/resourceUtils';

const doSleep = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

const waitOnDeletion = async (reader: () => Promise<void>) => {
  const MAX_TRIES = 25;
  let tries = 0;
  let deleted = false;

  while (!deleted && ++tries < MAX_TRIES) {
    await reader()
      .then(() => doSleep(1000))
      .catch(() => {
        deleted = true;
      });
  }
};

const waitOnCompletion = async (reader: () => Promise<boolean>): Promise<boolean> => {
  const MAX_TRIES = 60;
  let tries = 0;
  let completionStatus;

  while (completionStatus === undefined && ++tries < MAX_TRIES) {
    await reader()
      .then((res) => {
        completionStatus = res;
      })
      .catch(async () => {
        await doSleep(1000);
        return;
      });
  }
  return completionStatus || false;
};

export const createAccessSecret = async (
  appDef: OdhApplication,
  namespace: string,
  stringData: { [key: string]: string },
  coreV1Api: CoreV1Api,
): Promise<{ response: IncomingMessage; body: V1Secret }> => {
  const { enable } = appDef.spec;
  if (!enable) {
    return Promise.resolve(null);
  }

  stringData.configMapName = enable.validationConfigMap;
  const name = enable.validationSecret;
  const secret = {
    apiVersion: 'v1',
    metadata: { name, namespace },
    type: 'Opaque',
    stringData,
  };
  return coreV1Api
    .readNamespacedSecret(name, namespace)
    .then(() => {
      return coreV1Api.replaceNamespacedSecret(name, namespace, secret);
    })
    .catch(() => {
      return coreV1Api.createNamespacedSecret(namespace, secret);
    });
};

export const runValidation = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<boolean> => {
  const namespace = fastify.kube.namespace;
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const stringData = JSON.parse(query?.values ?? '');
  const batchV1beta1Api = fastify.kube.batchV1beta1Api;
  const batchV1Api = fastify.kube.batchV1Api;
  const coreV1Api = fastify.kube.coreV1Api;
  const appDef = getApplicationDef(appName);
  const { enable } = appDef.spec;

  const cmName = enable?.validationConfigMap;
  const cronjobName = enable?.validationJob;
  if (!cronjobName) {
    const error = createError(500, 'failed to validate');
    error.explicitInternalServerError = true;
    error.error = 'failed to find application definition file';
    error.message = 'Unable to validate the application.';
    throw error;
  }
  const jobName = `${cronjobName}-job-custom-run`;

  await createAccessSecret(appDef, namespace, stringData, coreV1Api);

  const cronJob = await batchV1beta1Api
    .readNamespacedCronJob(cronjobName, namespace)
    .then((res) => res.body);

  // Flag the cronjob as no longer suspended
  cronJob.spec.suspend = false;
  await batchV1beta1Api.replaceNamespacedCronJob(cronjobName, namespace, cronJob).catch((e) => {
    fastify.log.error(`failed to unsuspend cronjob: ${e.response.body.message}`);
  });

  // If there was a manual job already, delete it
  await batchV1Api.deleteNamespacedJob(jobName, namespace).catch(() => {
    return;
  });

  // wait for job to be deleted
  await waitOnDeletion(() => {
    return batchV1Api.readNamespacedJob(jobName, namespace).then(() => {
      return;
    });
  });

  // Wait for previous config map to be deleted
  if (cmName) {
    await waitOnDeletion(() => {
      return coreV1Api.readNamespacedConfigMap(cmName, namespace).then(() => {
        return;
      });
    });
  }

  const job = {
    apiVersion: 'batch/v1',
    metadata: {
      name: jobName,
      namespace,
      annotations: {
        'cronjob.kubernetes.io/instantiate': 'manual',
      },
    },
    spec: cronJob.spec.jobTemplate.spec,
  };

  await batchV1Api.createNamespacedJob(namespace, job);

  return await waitOnCompletion(() => {
    return batchV1Api.readNamespacedJobStatus(jobName, namespace).then((res) => {
      if (res.body.status.succeeded) {
        return true;
      }
      if (res.body.status.failed) {
        return false;
      }
      throw new Error();
    });
  });
};
