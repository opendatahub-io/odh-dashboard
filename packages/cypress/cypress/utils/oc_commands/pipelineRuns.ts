import { assertNamespace } from './mlflow';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const FAILED_PHASES = new Set(['Failed', 'Error']);

type ArgoWorkflow = {
  metadata?: {
    name?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  status?: { phase?: string };
};

const workflowHasRunId = (workflow: ArgoWorkflow, runId: string): boolean => {
  const { name = '', labels = {}, annotations = {} } = workflow.metadata ?? {};
  return (
    Object.values(labels).includes(runId) ||
    Object.values(annotations).includes(runId) ||
    name.includes(runId)
  );
};

const findWorkflowForRun = (stdout: string, runId: string): ArgoWorkflow | undefined => {
  try {
    const items = (JSON.parse(stdout) as { items?: ArgoWorkflow[] }).items ?? [];
    return items
      .filter((workflow) => workflowHasRunId(workflow, runId))
      .toSorted((a, b) =>
        (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? ''),
      )[0];
  } catch {
    return undefined;
  }
};

/**
 * Find the Argo workflow for a KFP run, then `oc wait` that object until Succeeded.
 * DSPA may delete completed workflows quickly, so a 5s list poll can miss Succeeded.
 */
export const waitForKfpRunSucceeded = (
  namespace: string,
  runId: string,
  timeoutMs: number,
): void => {
  const pollIntervalMs = 5000;
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs));
  const ns = assertNamespace(namespace);
  const listCommand = `oc get workflow.argoproj.io -n ${ns} -o json`;
  const startTime = Date.now();

  const waitOnWorkflow = (workflowName: string): void => {
    const remainingMs = Math.max(30000, timeoutMs - (Date.now() - startTime));
    const timeoutSec = Math.ceil(remainingMs / 1000);
    const waitCommand = `oc wait workflow.argoproj.io/${workflowName} -n ${ns} --for=jsonpath='{.status.phase}'=Succeeded --timeout=${timeoutSec}s`;

    cy.exec(waitCommand, { failOnNonZeroExit: false, timeout: remainingMs + 15000 }).then(
      (result) => {
        if (result.exitCode === 0) {
          cy.log(`Workflow ${workflowName} Succeeded`);
          return;
        }
        cy.exec(
          `oc get workflow.argoproj.io/${workflowName} -n ${ns} -o jsonpath='{.status.phase}'`,
          {
            failOnNonZeroExit: false,
            timeout: 30000,
          },
        ).then((phaseResult) => {
          const phase = phaseResult.stdout.trim();
          if (FAILED_PHASES.has(phase)) {
            throw new Error(`Workflow ${workflowName} for run ${runId} ended with phase ${phase}`);
          }
          const lookupOutput = `${phaseResult.stderr} ${phaseResult.stdout}`;
          if (phaseResult.exitCode !== 0 && /not found/i.test(lookupOutput)) {
            cy.log(
              `Workflow ${workflowName} was deleted while waiting; treating as completed by DSPA cleanup`,
            );
            return;
          }
          throw new Error(
            `Workflow ${workflowName} for run ${runId} did not succeed (phase=${
              phase || 'not found'
            }): ${maskSensitiveInfo(result.stderr || result.stdout)}`,
          );
        });
      },
    );
  };

  const find = (attempt = 1): void => {
    cy.exec(listCommand, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const matched = findWorkflowForRun(result.stdout, runId);
      const phase = matched?.status?.phase ?? '';
      const workflowName = matched?.metadata?.name;

      if (phase === 'Succeeded' && workflowName) {
        cy.log(`Workflow ${workflowName} Succeeded after ${elapsed}s`);
        return;
      }
      if (workflowName && FAILED_PHASES.has(phase)) {
        throw new Error(`Workflow ${workflowName} for run ${runId} ended with phase ${phase}`);
      }
      if (workflowName) {
        cy.log(
          `Found workflow ${workflowName} (phase=${phase || 'unknown'}); waiting for Succeeded`,
        );
        waitOnWorkflow(workflowName);
        return;
      }
      if (attempt >= maxAttempts) {
        throw new Error(`Run ${runId} did not create an Argo workflow after ${elapsed}s`);
      }
      cy.log(`Waiting for Argo workflow for run ${runId} (${elapsed}s)`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs).then(() => find(attempt + 1));
    });
  };

  cy.log(`Waiting for Argo workflow ${runId} to succeed (max ${timeoutMs / 1000}s)`);
  find();
};
