import { IncomingMessage } from 'http';
import { CoreV1Api, V1Secret } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplicationDef } from '../../../utils/resourceUtils';
import { getApplicationEnabledConfigMap } from '../../../utils/componentUtils';
import { V1ConfigMap } from '@kubernetes/client-node/dist/gen/model/v1ConfigMap';

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

const waitOnCompletion = async (
  fastify: KubeFastifyInstance,
  reader: () => Promise<{ valid: boolean; error: string }>,
): Promise<{ valid: boolean; error: string }> => {
  const MAX_TRIES = 120;
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

  if (completionStatus !== undefined) {
    return completionStatus;
  }

  fastify.log.error('validation job timed out.');
  return {
    valid: false,
    error: 'Validation process timed out. The application may still become enabled.',
  };
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
): Promise<{ valid: boolean; error: string }> => {
  const namespace = fastify.kube.namespace;
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const stringData = JSON.parse(query?.values ?? '');
  const batchV1beta1Api = fastify.kube.batchV1beta1Api;
  const batchV1Api = fastify.kube.batchV1Api;
  const coreV1Api = fastify.kube.coreV1Api;
  const appDef = getApplicationDef(appName);
  const { enable } = appDef.spec;

  const cronjobName = enable?.validationJob;
  if (!cronjobName) {
    return Promise.resolve({
      valid: false,
      error: 'Validation job is undefined.',
    });
  }
  const jobName = `${cronjobName}-job-custom-run`;

  await createAccessSecret(appDef, namespace, stringData, coreV1Api);

  const cronJob = await batchV1beta1Api
    .readNamespacedCronJob(cronjobName, namespace)
    .then((res) => res.body)
    .catch(() => {
      fastify.log.error(`validation cronjob does not exist`);
    });

  if (!cronJob) {
    return Promise.resolve({
      valid: false,
      error: 'The validation job for the application does not exist.',
    });
  }

  const updateCronJobSuspension = (suspend: boolean) => {
    // Flag the cronjob as no longer suspended
    cronJob.spec.suspend = suspend;
    batchV1beta1Api.replaceNamespacedCronJob(cronjobName, namespace, cronJob).catch((e) => {
      fastify.log.error(
        `failed to ${suspend ? 'suspend' : 'unsuspend'} cronjob: ${e.response.body.message}`,
      );
    });
  };

  // Suspend the cron job
  await updateCronJobSuspension(true);

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

  const { body } = await batchV1Api.createNamespacedJob(namespace, job).catch(() => {
    fastify.log.error(`failed to create validation job`);

    // Flag the cronjob as no longer suspended
    updateCronJobSuspension(false);

    return { response: null, body: null };
  });

  if (!body) {
    // Flag the cronjob as no longer suspended
    updateCronJobSuspension(false);

    return Promise.resolve({ valid: false, error: 'Failed to create validation job.' });
  }

  return await waitOnCompletion(fastify, () => {
    return batchV1Api.readNamespacedJobStatus(jobName, namespace).then(async (res) => {
      if (res.body.status.succeeded) {
        const cm = await getApplicationEnabledConfigMap(fastify, appDef);
        const success = cm?.data?.validation_result === 'true';
        if (!success) {
          fastify.log.warn(`failed attempted validation for ${appName}`);
        }
        return {
          valid: success,
          error: success ? '' : 'Error attempting to validate. Please check your entries.',
        };
      }
      if (res.body.status.failed) {
        return { valid: false, error: 'Validation job failed.' };
      }
      throw new Error();
    });
  }).finally(() => {
    // Flag the cronjob as no longer suspended
    updateCronJobSuspension(false);
  });
};

export const validateISV = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ valid: boolean; error: string }> => {
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const appDef = getApplicationDef(appName);
  const { enable } = appDef.spec;
  const namespace = fastify.kube.namespace;
  const cmName = enable?.validationConfigMap;

  // If there are variables associated with enablement, run the validation
  if (enable?.variables?.length) {
    return runValidation(fastify, request);
  }

  if (!cmName) {
    fastify.log.error('attempted validation of application with no config map.');
    return Promise.resolve({
      valid: false,
      error: 'The validation config map for the application does not exist.',
    });
  }

  const cmBody: V1ConfigMap = {
    metadata: {
      name: cmName,
      namespace: namespace,
    },
    data: {
      validation_result: 'true',
    },
  };

  const coreV1Api = fastify.kube.coreV1Api;
  return coreV1Api
    .createNamespacedConfigMap(namespace, cmBody)
    .then(async () => {
      const cm = await getApplicationEnabledConfigMap(fastify, appDef);
      const success = cm?.data?.validation_result === 'true';
      if (!success) {
        fastify.log.warn(`failed attempted validation for ${appName}`);
      }
      return {
        valid: success,
        error: success ? '' : 'Error adding validation flag.',
      };
    })
    .catch((e) => {
      fastify.log.warn(`failed creation of validation configmap: ${e.message}`);
      return { valid: false, error: 'Error adding validation flag.' };
    });
};
