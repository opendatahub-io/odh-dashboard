import { provisionProjectForAutoX } from './autoXPipelines';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { settleAutomlRun } from './oc_commands/automlRunCleanup';
import { verifyOpenShiftProjectExists } from './oc_commands/project';
import { runAwsCliInCluster } from './oc_commands/s3Cleanup';
import { resolveAutoXS3Endpoint } from './autoXS3';
import type { AutomlTestData, AWSS3Buckets } from '../types';
import {
  AUTOML_CLEANUP_OWNER_LABEL,
  buildAutomlS3CleanupScript,
  getAutoXCleanupActions,
  matchesAutomlCleanupOwnership,
} from '../../src/automlCleanupCommands';
import {
  type AutoXOutputRoot,
  type AutomlCleanupManifest,
  type AutomlCleanupProject,
} from '../../src/automlCleanupManifest';

const spec = (): string => Cypress.spec.relative;
const POLL_INTERVAL_MS = 5000;

interface AutoXNamespaceInspection {
  exists: boolean;
  uid?: string;
  cleanupToken?: string;
  error?: string;
}

interface AutoXCleanupStatus {
  runsTerminal: boolean;
  namespaceExists: boolean;
  owned: boolean;
  inspectionFailed: boolean;
}

/** Allocate a fresh namespace for every setup attempt without waiting on a stale one. */
export const setupAutoXProject = (
  testData: Pick<AutomlTestData, 'projectNamePrefix' | 'dspaSecretName' | 'awsBucket'>,
  uuid: string,
): Cypress.Chainable<string> =>
  ensureAdminOcSession().then(() =>
    cy.task<AutomlCleanupManifest | null>('automlCleanup:get', spec()).then((manifest) => {
      const buckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets;
      const firstAttempt = (manifest?.projects.length ?? 0) + 1;
      const chooseName = (attempt: number): Cypress.Chainable<string> => {
        if (attempt > firstAttempt + 20) {
          throw new Error(`Could not allocate an AutoX project for ${spec()}`);
        }
        const namespace = `${testData.projectNamePrefix}-${uuid}-${attempt}`;
        if (namespace.length > 63) {
          throw new Error(`AutoX project name is too long: ${namespace}`);
        }
        return verifyOpenShiftProjectExists(namespace).then((exists) => {
          if (exists) {
            cy.log(`AutoX project ${namespace} already exists; trying the next name`);
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
              throw new Error(`Could not identify the cluster for AutoX project ${namespace}`);
            }
            return cy
              .task<AutomlCleanupManifest>('automlCleanup:recordProject', {
                spec: spec(),
                namespace,
                bucketKey: testData.awsBucket,
                bucketName: buckets[testData.awsBucket].NAME,
                clusterServer: server.stdout.trim(),
                s3Endpoint: resolveAutoXS3Endpoint(buckets[testData.awsBucket].ENDPOINT),
              })
              .then((recorded: AutomlCleanupManifest) => {
                const project = recorded.projects.find((entry) => entry.namespace === namespace);
                const cleanupToken = project?.cleanupToken;
                if (!cleanupToken) {
                  throw new Error(
                    `Could not record ownership token for AutoX project ${namespace}`,
                  );
                }
                // The project name was checked above. Never block this attempt on deletion
                // of an older project with the same name.
                provisionProjectForAutoX(
                  namespace,
                  testData.dspaSecretName,
                  testData.awsBucket,
                  false,
                  {
                    token: cleanupToken,
                    onOwned: (namespaceUID) =>
                      cy.task('automlCleanup:recordNamespace', {
                        spec: spec(),
                        namespace,
                        cleanupToken,
                        namespaceUID,
                      }),
                  },
                );
                return cy.wrap(namespace);
              });
          }),
      );
    }),
  );

export const setupAutomlProject = setupAutoXProject;

export const recordAutoXUpload = (namespace: string, key: string): Cypress.Chainable<string> =>
  cy.task('automlCleanup:recordUpload', { spec: spec(), namespace, key }).then(() => key);

export const recordAutomlUpload = recordAutoXUpload;

export const recordAutoXRun = (
  namespace: string,
  id: string,
  outputRoot: AutoXOutputRoot,
): Cypress.Chainable<string> =>
  cy.task('automlCleanup:recordRun', { spec: spec(), namespace, id, outputRoot }).then(() => id);

export const recordAutomlRun = (
  namespace: string,
  id: string,
  taskType: AutomlTestData['taskType'],
): Cypress.Chainable<string> =>
  recordAutoXRun(
    namespace,
    id,
    taskType === 'timeseries'
      ? 'autogluon-timeseries-training-pipeline'
      : 'autogluon-tabular-training-pipeline',
  );

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

const deleteAndVerifyProject = (
  namespace: string,
  namespaceUID: string,
): Cypress.Chainable<boolean> => {
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
                  `AutoX namespace ${namespace} remains; finalizers=${JSON.stringify(
                    finalizers,
                  )}, conditions=${JSON.stringify(conditions)}`,
                );
              } catch {
                cy.log(`AutoX namespace ${namespace} remains; could not parse namespace status`);
              }
            }
            return cy.wrap(false);
          });
      }
      // Poll the deletion state until the bounded cleanup window expires.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(POLL_INTERVAL_MS).then(() => poll(attempt + 1));
    });

  return cy
    .task<{ deleted: boolean; error?: string }>('automlCleanup:deleteProject', {
      namespace,
      namespaceUID,
    })
    .then((result): Cypress.Chainable<boolean> => {
      if (!result.deleted) {
        return cy
          .log(
            `Could not request deletion of AutoX project ${namespace}: ${
              result.error ?? 'unknown error'
            }`,
          )
          .then(() => cy.wrap(false));
      }
      return poll(1);
    });
};

const cleanupProject = (project: AutomlCleanupProject): Cypress.Chainable<string[]> => {
  if (project.projectDeleted && project.s3Cleaned) {
    return cy.wrap<string[]>([]);
  }

  const errors: string[] = [];
  const buckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined;
  const configuredExecutorNamespace =
    (Cypress.env('CY_AUTOX_CLEANUP_NAMESPACE') as string | undefined) ||
    (Cypress.env('CY_AUTOML_CLEANUP_NAMESPACE') as string | undefined);
  const executorNamespace = configuredExecutorNamespace || project.namespace;

  const hasS3Work = project.uploads.length > 0 || project.runs.length > 0;
  let { namespaceUID } = project;
  const inspectNamespace = (): Cypress.Chainable<AutoXNamespaceInspection> => {
    if (project.projectDeleted) {
      return cy.wrap<AutoXNamespaceInspection>({ exists: false });
    }
    return cy
      .exec(`oc get namespace ${project.namespace} --ignore-not-found -o json`, {
        failOnNonZeroExit: false,
        log: false,
      })
      .then((result): AutoXNamespaceInspection => {
        if (result.exitCode !== 0) {
          return {
            exists: false,
            error: `Could not inspect AutoX namespace ${project.namespace}: ${result.stderr}`,
          };
        }
        if (!result.stdout.trim()) {
          return { exists: false };
        }
        try {
          const namespace = JSON.parse(result.stdout) as {
            metadata?: { uid?: string; labels?: Record<string, string> };
          };
          return {
            exists: true,
            uid: namespace.metadata?.uid,
            cleanupToken: namespace.metadata?.labels?.[AUTOML_CLEANUP_OWNER_LABEL],
          };
        } catch {
          return {
            exists: false,
            error: `Could not parse AutoX namespace ${project.namespace}`,
          };
        }
      });
  };

  return inspectNamespace()
    .then((namespace): Cypress.Chainable<AutoXNamespaceInspection> => {
      if (
        namespace.exists &&
        project.cleanupToken &&
        !namespaceUID &&
        namespace.uid &&
        namespace.cleanupToken === project.cleanupToken
      ) {
        namespaceUID = namespace.uid;
        return cy
          .task('automlCleanup:recordNamespace', {
            spec: spec(),
            namespace: project.namespace,
            cleanupToken: project.cleanupToken,
            namespaceUID: namespace.uid,
          })
          .then(() => cy.wrap<AutoXNamespaceInspection>(namespace));
      }
      return cy.wrap<AutoXNamespaceInspection>(namespace);
    })
    .then((namespace): Cypress.Chainable<AutoXCleanupStatus> => {
      if (namespace.error) {
        errors.push(namespace.error);
        return cy.wrap<AutoXCleanupStatus>({
          runsTerminal: false,
          namespaceExists: false,
          owned: false,
          inspectionFailed: true,
        });
      }
      if (namespace.exists) {
        if (!matchesAutomlCleanupOwnership({ ...project, namespaceUID }, namespace)) {
          errors.push(`AutoX namespace ${project.namespace} does not match its recorded ownership`);
          return cy.wrap<AutoXCleanupStatus>({
            runsTerminal: false,
            namespaceExists: true,
            owned: false,
            inspectionFailed: false,
          });
        }
        return settleRecordedRuns(project).then((runErrors) => {
          errors.push(...runErrors);
          return cy.wrap<AutoXCleanupStatus>({
            runsTerminal: runErrors.length === 0,
            namespaceExists: true,
            owned: true,
            inspectionFailed: false,
          });
        });
      }
      return cy.wrap<AutoXCleanupStatus>({
        runsTerminal: true,
        namespaceExists: false,
        owned: false,
        inspectionFailed: false,
      });
    })
    .then(({ runsTerminal, namespaceExists, owned, inspectionFailed }) => {
      const cleanupActions = getAutoXCleanupActions(project, {
        runsTerminal,
        namespaceExists,
        owned,
        inspectionFailed,
        namespaceUID,
      });
      let s3Work: Cypress.Chainable<boolean>;
      if (inspectionFailed) {
        s3Work = cy.wrap(project.s3Cleaned);
      } else if (project.s3Cleaned || !hasS3Work) {
        s3Work = cy.wrap(true);
      } else if (!runsTerminal) {
        cy.log(`Skipping S3 deletion for ${project.namespace} until its runs are terminal`);
        s3Work = cy.wrap(false);
      } else if (!project.projectDeleted && !namespaceUID) {
        errors.push(`AutoX namespace UID is missing for ${project.namespace}; refusing S3 cleanup`);
        s3Work = cy.wrap(false);
      } else if (!cleanupActions.canCleanS3) {
        s3Work = cy.wrap(false);
      } else if (
        (!namespaceExists || project.projectDeleted) &&
        (!configuredExecutorNamespace || executorNamespace === project.namespace)
      ) {
        errors.push(
          `A stable AutoX cleanup namespace is required to retry S3 cleanup for ${project.namespace}`,
        );
        s3Work = cy.wrap(false);
      } else if (!buckets) {
        errors.push(`S3 configuration is unavailable for ${project.namespace}`);
        s3Work = cy.wrap(false);
      } else if (
        !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(executorNamespace) ||
        executorNamespace.length > 63
      ) {
        errors.push(`Invalid AutoX cleanup executor namespace: ${executorNamespace}`);
        s3Work = cy.wrap(false);
      } else {
        try {
          const bucket = buckets[project.bucketKey];
          const script = buildAutomlS3CleanupScript(bucket, project);
          const podName = `automl-s3-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          s3Work = runAwsCliInCluster({
            namespace: executorNamespace,
            podName,
            region: bucket.REGION,
            command: ['sh', '-c'],
            awsCliArgs: [script],
            timeout: 900000,
          }).then((result) => {
            if (result.exitCode !== 0) {
              errors.push(`S3 deletion or verification failed for ${project.namespace}`);
            }
            return result.exitCode === 0;
          });
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          s3Work = cy.wrap(false);
        }
      }

      return s3Work.then((s3Cleaned) => {
        let deletion: Cypress.Chainable<boolean>;
        if (cleanupActions.projectDeletion === 'delete' && namespaceUID) {
          deletion = deleteAndVerifyProject(project.namespace, namespaceUID);
        } else if (cleanupActions.projectDeletion === 'already-complete') {
          deletion = cy.wrap(true);
        } else {
          if (!inspectionFailed && namespaceExists && owned && !runsTerminal) {
            errors.push(
              `Project ${project.namespace} was retained because its KFP runs were not confirmed terminal`,
            );
          }
          deletion = cy.wrap(false);
        }
        return deletion.then((projectDeleted) => {
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
        });
      });
    });
};

/** Teardown every setup attempt and report cleanup failures after all projects were processed. */
export const cleanupAutoXResources = (): void => {
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
          throw new Error(`AutoX cleanup incomplete: ${errors.join('; ')}`);
        }
      }),
    );
  });
};

export const cleanupAutomlResources = cleanupAutoXResources;
