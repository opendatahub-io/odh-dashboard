import * as yaml from 'js-yaml';
import type { PollOptions } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

type TracingCollectorConfig = {
  exporters?: Record<string, { endpoint?: string; headers?: Record<string, string> }>;
  connectors?: Record<
    string,
    { table?: { context?: string; condition?: string; pipelines?: string[] }[] }
  >;
  service?: {
    pipelines?: Record<string, { receivers?: string[]; exporters?: string[] }>;
  };
};

/**
 * Wait for a project's routing entries, pipeline, and MLflow exporter to be
 * persisted in the dedicated collector CR. This does not prove that the running
 * collector has applied the configuration or that MLflow has ingested a trace.
 */
export const waitForPlaygroundTracingRoute = (
  projectName: string,
  collectorNamespace: string,
  { maxAttempts = 30, pollIntervalMs = 2000 }: PollOptions = {},
): Cypress.Chainable<string> => {
  if (
    ![projectName, collectorNamespace].every(
      (name) => name.length <= 63 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name),
    )
  ) {
    throw new Error('Invalid project or collector namespace for tracing route lookup');
  }

  const collectorName = 'gen-ai-trace-collector';
  const exporterName = `otlphttp/mlflow-${projectName}`;
  const pipelineName = `traces/${projectName}`;
  const condition = `attributes["k8s.namespace.name"] == "${projectName}"`;
  const command = `oc get opentelemetrycollectors.opentelemetry.io ${collectorName} -n ${collectorNamespace} --ignore-not-found -o json --request-timeout=10s`;

  const check = (attempt = 1): Cypress.Chainable<string> =>
    cy.exec(command, { failOnNonZeroExit: false, log: false }).then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to query tracing collector ${collectorNamespace}/${collectorName}: ${maskSensitiveInfo(
            result.stderr,
          )}`,
        );
      }
      let config: TracingCollectorConfig | undefined;
      if (result.stdout.trim()) {
        try {
          const resource = JSON.parse(result.stdout) as {
            spec?: { config?: TracingCollectorConfig | string };
          };
          config =
            typeof resource.spec?.config === 'string'
              ? (yaml.load(resource.spec.config) as TracingCollectorConfig)
              : resource.spec?.config;
        } catch {
          // Do not expose raw collector configuration, which may contain credentials.
          throw new Error(`Cannot parse tracing collector ${collectorNamespace}/${collectorName}`);
        }
      }
      const exporter = config?.exporters?.[exporterName];
      const experimentId = exporter?.headers?.['x-mlflow-experiment-id'];
      const pipeline = config?.service?.pipelines?.[pipelineName];
      const table = config?.connectors?.['routing/traces']?.table;
      if (
        exporter?.headers?.['X-MLFLOW-WORKSPACE'] === projectName &&
        typeof experimentId === 'string' &&
        experimentId.trim() !== '' &&
        typeof exporter.endpoint === 'string' &&
        exporter.endpoint.trim() !== '' &&
        Array.isArray(pipeline?.receivers) &&
        pipeline.receivers.includes('routing/traces') &&
        Array.isArray(pipeline.exporters) &&
        pipeline.exporters.includes(exporterName) &&
        Array.isArray(table) &&
        ['resource', 'span'].every((context) =>
          table.some(
            (entry) =>
              entry.context === context &&
              entry.condition === condition &&
              Array.isArray(entry.pipelines) &&
              entry.pipelines.includes(pipelineName),
          ),
        )
      ) {
        return cy.wrap(collectorNamespace, { log: false });
      }
      if (attempt >= maxAttempts) {
        throw new Error(
          `Tracing route for project ${projectName} was not configured in ${collectorNamespace}/${collectorName} after ${maxAttempts} attempts: expected resource/span routing, connected pipeline, and MLflow workspace/experiment exporter`,
        );
      }
      cy.log(`Waiting for tracing route for project ${projectName} (${attempt}/${maxAttempts})`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs, { log: false }).then(() => check(attempt + 1));
    });

  return check();
};
