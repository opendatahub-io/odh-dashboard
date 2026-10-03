import { provisionProjectForAutoX } from './autoXPipelines';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { settleAutomlRun } from './oc_commands/automlRunCleanup';
import { verifyOpenShiftProjectExists } from './oc_commands/project';
import { runAwsCliInCluster } from './oc_commands/s3Cleanup';
import type { AutomlTestData, AWSS3Buckets } from '../types';
import { buildAutomlS3CleanupScript } from '../../src/automlCleanupCommands';
import type { AutomlCleanupManifest, AutomlCleanupProject } from '../../src/automlCleanupManifest';

const spec = (): string => Cypress.spec.relative;
const POLL_INTERVAL_MS = 5000;

/** Allocate a fresh namespace for every setup attempt without waiting on a stale one. */
export const setupAutomlProject = (
  testData: AutomlTestData,
  uuid: string,
): Cypress.Chainable<string> =>
  ensureAdminOcSession().then(() =>
    cy.task<AutomlCleanupManifest | null>('automlCleanup:get', spec()).then((manifest) => {
      const buckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets;
      const firstAttempt = (manifest?.projects.length ?? 0) + 1;
      const chooseName = (attempt: number): Cypress.Chainable<string> => {
        if (attempt > firstAttempt + 20) {
          throw new Error(`Could not allocate an AutoML project for ${spec()}`);
        }
        const namespace = `${testData.projectNamePrefix}-${uuid}-${attempt}`;
        if (namespace.length > 63) {
          throw new Error(`AutoML project name is too long: ${namespace}`);
        }
        return verifyOpenShiftProjectExists(namespace).then((exists) => {
          if (exists) {
            cy.log(`AutoML project ${namespace} already exists; trying the next name`);
            return chooseName(attempt + 1);
          }
          return cy.wrap(namespace);
        });
      };

      return chooseName(firstAttempt).then((namespace) =>
        cy
          .exec('oc whoami --show-server', { failOnNonZeroExit: false, log: false })
          .then((server) => {
            if (server.exitCode !== 0 || !server.stdout.trim()) {
              throw new Error(`Could not identify the cluster for AutoML project ${namespace}`);
            }
            return cy
              .task('automlCleanup:recordProject', {
                spec: spec(),
                namespace,
                bucketKey: testData.awsBucket,
                bucketName: buckets[testData.awsBucket].NAME,
                clusterServer: server.stdout.trim(),
              })
              .then(() => {
                // The project name was checked above. Never block this attempt on deletion
                // of an older project with the same name.
                provisionProjectForAutoX(
                  namespace,
                  testData.dspaSecretName,
                  testData.awsBucket,
                  false,
                );
                return cy.wrap(namespace);
              });
          }),
      );
    }),
  );

export const recordAutomlUpload = (namespace: string, key: string): Cypress.Chainable<string> =>
  cy.task('automlCleanup:recordUpload', { spec: spec(), namespace, key }).then(() => key);

export const recordAutomlRun = (
  namespace: string,
  id: string,
  taskType: AutomlTestData['taskType'],
): Cypress.Chainable<string> =>
  cy
    .task('automlCleanup:recordRun', {
      spec: spec(),
      namespace,
      id,
      outputRoot:
        taskType === 'timeseries'
          ? 'autogluon-timeseries-training-pipeline'
          : 'autogluon-tabular-training-pipeline',
    })
    .then(() => id);

const settleRecordedRuns = (project: AutomlCleanupProject): Cypress.Chainable<string[]> => {
  const errors: string[] = [];
  const next = (index: number): Cypress.Chainable<string[]> => {
    if (index >= project.runs.length) {
      return cy.wrap(errors);
    }
    const run = project.runs[index];
    return settleAutomlRun(project.namespace, run.id).then((terminal) => {
      if (!terminal) {
        errors.push(`KFP run ${run.id} was not confirmed terminal`);
      }
      return next(index + 1);
    });
  };
  return next(0);
};

const deleteAndVerifyProject = (namespace: string): Cypress.Chainable<boolean> => {
  const maxPolls = 24;
  const poll = (attempt: number): Cypress.Chainable<boolean> =>
    verifyOpenShiftProjectExists(namespace).then((exists): Cypress.Chainable<boolean> => {
      if (!exists) {
        return cy.wrap(true);
      }
      if (attempt >= maxPolls) {
        return cy
          .exec(`oc get namespace ${namespace} -o json`, {
            failOnNonZeroExit: false,
            log: false,
          })
          .then((result) => {
            if (result.exitCode === 0) {
              try {
                const ns = JSON.parse(result.stdout) as {
                  metadata?: { finalizers?: string[] };
                  spec?: { finalizers?: string[] };
                  status?: { conditions?: { type: string; message?: string }[] };
                };
                const finalizers = {
                  metadata: ns.metadata?.finalizers ?? [],
                  spec: ns.spec?.finalizers ?? [],
                };
                const conditions = ns.status?.conditions ?? [];
                cy.log(
                  `AutoML namespace ${namespace} remains; finalizers=${JSON.stringify(
                    finalizers,
                  )}, conditions=${JSON.stringify(conditions)}`,
                );
              } catch {
                cy.log(`AutoML namespace ${namespace} remains; could not parse namespace status`);
              }
            }
            return false;
          });
      }
      // Poll the deletion state until the bounded cleanup window expires.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(POLL_INTERVAL_MS).then(() => poll(attempt + 1));
    });

  return cy
    .exec(`oc delete project ${namespace} --wait=false --ignore-not-found`, {
      failOnNonZeroExit: false,
      log: false,
    })
    .then((result): Cypress.Chainable<boolean> => {
      if (result.exitCode !== 0) {
        return cy
          .log(`Could not request deletion of AutoML project ${namespace}: ${result.stderr}`)
          .then(() => false);
      }
      return poll(1);
    });
};

const cleanupProject = (project: AutomlCleanupProject): Cypress.Chainable<string[]> => {
  const errors: string[] = [];
  const buckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined;
  const executorNamespace =
    (Cypress.env('CY_AUTOML_CLEANUP_NAMESPACE') as string | undefined) || project.namespace;

  return settleRecordedRuns(project)
    .then((runErrors): Cypress.Chainable<boolean> => {
      errors.push(...runErrors);
      if (runErrors.length > 0) {
        return cy
          .log(`Skipping S3 deletion for ${project.namespace} until its runs are terminal`)
          .then(() => false);
      }
      if (project.uploads.length === 0 && project.runs.length === 0) {
        return cy.wrap(true);
      }
      if (!buckets) {
        errors.push(`S3 configuration is unavailable for ${project.namespace}`);
        return cy.wrap(false);
      }
      if (
        !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(executorNamespace) ||
        executorNamespace.length > 63
      ) {
        errors.push(`Invalid AutoML cleanup executor namespace: ${executorNamespace}`);
        return cy.wrap(false);
      }
      let script: string;
      try {
        script = buildAutomlS3CleanupScript(buckets[project.bucketKey], project);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        return cy.wrap(false);
      }
      return runAwsCliInCluster({
        namespace: executorNamespace,
        podName: `automl-s3-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        region: buckets[project.bucketKey].REGION,
        command: ['sh', '-c'],
        awsCliArgs: [script],
        timeout: 900000,
      }).then((result) => {
        if (result.exitCode !== 0) {
          errors.push(`S3 deletion or verification failed for ${project.namespace}`);
        }
        return result.exitCode === 0;
      });
    })
    .then((s3Cleaned) =>
      deleteAndVerifyProject(project.namespace).then((projectDeleted) => {
        if (!projectDeleted) {
          errors.push(`Project ${project.namespace} still exists after cleanup`);
        }
        return cy
          .task('automlCleanup:markProject', {
            spec: spec(),
            namespace: project.namespace,
            s3Cleaned,
            projectDeleted,
            errors,
          })
          .then(() => errors);
      }),
    );
};

/** Teardown every setup attempt and report cleanup failures after all projects were processed. */
export const cleanupAutomlResources = (): void => {
  cy.task<AutomlCleanupManifest | null>('automlCleanup:get', spec()).then((manifest) => {
    if (!manifest) {
      return;
    }
    const failures: string[] = [];
    const next = (index: number): Cypress.Chainable<string[]> => {
      if (index >= manifest.projects.length) {
        return cy.wrap(failures);
      }
      return cleanupProject(manifest.projects[index]).then((errors) => {
        failures.push(...errors);
        return next(index + 1);
      });
    };

    return ensureAdminOcSession().then(() =>
      next(0).then((errors) => {
        if (errors.length > 0) {
          throw new Error(`AutoML cleanup incomplete: ${errors.join('; ')}`);
        }
      }),
    );
  });
};
