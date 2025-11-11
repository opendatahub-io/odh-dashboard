import { IncomingMessage } from 'http';
import { CoreV1Api, V1Secret, V1ConfigMap } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { CronJobKind, KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplication, updateApplications } from '../../../utils/resourceUtils';
import { getApplicationEnabledConfigMap } from '../../../utils/resourceUtils';

const doSleep = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

const waitOnDeletion = async (reader: () => Promise<void>) => {
  const MAX_TRIES = 200;
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
  reader: () => Promise<boolean>,
): Promise<void> => {
  const MAX_TRIES = 120;
  let tries = 0;
  let completionStatus;

  while (!completionStatus && ++tries < MAX_TRIES) {
    completionStatus = await reader();
    if (!completionStatus) {
      await doSleep(1000);
    }
  }

  if (!completionStatus) {
    fastify.log.warn('validation job timed out.');
  }
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
    metadata: {
      name,
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
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
): Promise<{ complete: boolean; valid: boolean; error: string }> => {
  const namespace = fastify.kube.namespace;
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const stringData = JSON.parse(query?.values ?? '');
  const batchV1Api = fastify.kube.batchV1Api;
  const coreV1Api = fastify.kube.coreV1Api;
  const customObjectsApi = fastify.kube.customObjectsApi;
  const appDef = getApplication(appName);
  const { enable } = appDef.spec;

  const cronjobName = enable?.validationJob;
  if (!cronjobName) {
    return { complete: true, valid: false, error: 'Validation job is undefined.' };
  }
  const jobName = `${cronjobName}-job-custom-run`;

  await createAccessSecret(appDef, namespace, stringData, coreV1Api).catch((e) => {
    fastify.log.error(`Unable to create secret: ${e.response?.body?.message ?? e.message}`);
  });

  const cronJob = await customObjectsApi
    .getNamespacedCustomObject('batch', 'v1', namespace, 'cronjobs', cronjobName)
    .then((res) => res.body as CronJobKind)
    .catch(() => {
      fastify.log.error(`validation cronjob does not exist`);
    });

  if (!cronJob) {
    fastify.log.error('The validation job for the application does not exist.');
    return {
      complete: true,
      valid: false,
      error: 'The validation job for the application does not exist.',
    };
  }

  const updateCronJobSuspension = async (suspend: boolean) => {
    try {
      const updateCronJob = await customObjectsApi
        .getNamespacedCustomObject('batch', 'v1', namespace, 'cronjobs', cronjobName)
        .then((res) => res.body as CronJobKind);

      // Flag the cronjob as no longer suspended
      updateCronJob.spec.suspend = suspend;
      await customObjectsApi.replaceNamespacedCustomObject(
        'batch',
        'v1',
        namespace,
        'cronjobs',
        cronjobName,
        updateCronJob,
      );
    } catch (e) {
      fastify.log.error(
        `failed to ${suspend ? 'suspend' : 'unsuspend'} cronjob: ${e.response.body.message}`,
      );
    }
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
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    spec: cronJob.spec.jobTemplate.spec,
  };

  const { body } = await batchV1Api.createNamespacedJob(namespace, job).catch(async () => {
    fastify.log.error(`failed to create validation job`);

    // Flag the cronjob as no longer suspended
    await updateCronJobSuspension(false);

    return { body: null };
  });

  if (!body) {
    // Flag the cronjob as no longer suspended
    await updateCronJobSuspension(false);

    fastify.log.error('failed to create validation job');
    return { complete: true, valid: false, error: 'Failed to create validation job.' };
  }

  waitOnCompletion(fastify, async () => {
    const res = await batchV1Api.readNamespacedJobStatus(jobName, namespace);
    if (res.body.status.succeeded) {
      return true;
    }
    if (res.body.status.failed) {
      fastify.log.error('Validation job failed failed to run');
      return true;
    }
    return false;
  }).finally(() => {
    // Flag the cronjob as no longer suspended
    updateCronJobSuspension(false);
  });

  return { complete: false, valid: false, error: null };
};

export const validateISV = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ complete: boolean; valid: boolean; error: string }> => {
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const appDef = getApplication(appName);
  const { enable } = appDef.spec;
  const namespace = fastify.kube.namespace;
  const cmName = enable?.validationConfigMap;

  // If there are variables associated with enablement, run the validation
  if (enable?.variables && Object.keys(enable.variables).length > 0) {
    return runValidation(fastify, request);
  }

  if (!cmName) {
    fastify.log.error('attempted validation of application with no config map.');
    return {
      complete: true,
      valid: false,
      error: 'The validation config map for the application does not exist.',
    };
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

  const checkResult = async () => {
    const success = await getApplicationEnabledConfigMap(fastify, appDef);
    if (success) {
      await updateApplications();
    }
    return {
      complete: true,
      valid: success,
      error: success ? '' : 'Error adding validation flag.',
    };
  };

  const catchError = (e: Error) => {
    fastify.log.warn(`failed creation of validation configmap: ${e.message}`);
    return { complete: true, valid: false, error: 'Error adding validation flag.' };
  };

  const coreV1Api = fastify.kube.coreV1Api;
  return coreV1Api
    .readNamespacedConfigMap(cmName, namespace)
    .then(async () => {
      const success = await getApplicationEnabledConfigMap(fastify, appDef);
      if (success) {
        await updateApplications();
      } else {
        fastify.log.warn(`failed attempted validation for ${appName}`);
      }
      return {
        complete: true,
        valid: success,
        error: success ? '' : 'Error adding validation flag.',
      };
    })
    .catch(async () => {
      return coreV1Api
        .createNamespacedConfigMap(namespace, cmBody)
        .then(checkResult)
        .catch(catchError);
    });
};

export const getValidateISVResults = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ complete: boolean; valid: boolean; error: string }> => {
  const batchV1Api = fastify.kube.batchV1Api;
  const query = request.query as { [key: string]: string };
  const appName = query?.appName;
  const appDef = getApplication(appName);
  const { enable } = appDef.spec;
  const namespace = fastify.kube.namespace;
  const cmName = enable?.validationConfigMap;

  if (!cmName) {
    fastify.log.error('attempted validation of application with no config map.');
    return {
      complete: true,
      valid: false,
      error: 'The validation config map for the application does not exist.',
    };
  }

  // If there are variables associated with enablement, check the job status
  if (enable?.variables && Object.keys(enable.variables).length > 0) {
    const cronjobName = enable?.validationJob;
    if (!cronjobName) {
      return { complete: true, valid: false, error: 'Validation job is undefined.' };
    }
    const jobName = `${cronjobName}-job-custom-run`;

    try {
      const complete = await batchV1Api
        .readNamespacedJobStatus(jobName, namespace)
        .then(async (res) => {
          return res.body.status.succeeded || res.body.status.failed;
        });
      if (!complete) {
        return { complete: false, valid: false, error: null };
      }
    } catch {
      return { complete: true, valid: false, error: 'Failed to create validation job.' };
    }
  }

  // Check the results config map
  const success = await getApplicationEnabledConfigMap(fastify, appDef);
  if (success) {
    await updateApplications();
  } else {
    fastify.log.warn(`failed attempted validation for ${appName}`);
  }
  return {
    complete: true,
    valid: success,
    error: success ? '' : 'Error attempting to validate. Please check your entries.',
  };
};
