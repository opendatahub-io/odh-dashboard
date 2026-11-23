import type { RegistryTarget } from '../oc_commands/featureStoreResources';

const execRegistryApi = (
  namespace: string,
  deployName: string,
  container: string,
  apiPath: string,
): Cypress.Chainable<Record<string, unknown>> => {
  const cmd =
    `oc exec -n ${namespace} deploy/${deployName} -c ${container} -- ` +
    `sh -c 'curl -sk -w "\\n%{http_code}" -H "Authorization: Bearer ` +
    `$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" ` +
    `"https://localhost:6573${apiPath}"'`;

  return cy.exec(cmd, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      throw new Error(`Registry API call failed (${apiPath}): ${result.stderr || result.stdout}`);
    }
    const lines = result.stdout.trim().split('\n');
    const httpStatus = parseInt(lines[lines.length - 1], 10);
    const raw = lines.slice(0, -1).join('\n').trim();
    if (Number.isNaN(httpStatus) || httpStatus < 200 || httpStatus >= 300) {
      throw new Error(
        `Registry API returned HTTP ${httpStatus} (${apiPath}): ${raw.slice(0, 500)}`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Registry API returned non-JSON (${apiPath}): ${raw.slice(0, 500)}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`Registry API returned unexpected shape (${apiPath}): ${raw.slice(0, 500)}`);
    }
    return cy.wrap(parsed as Record<string, unknown>);
  });
};

type MetricsCounts = {
  featureCount: number;
  entityCount: number;
  datasetCount: number;
  dataSourceCount: number;
  featureViewCount: number;
  featureServiceCount: number;
};

export const getMetricsResourceCounts = (
  target: RegistryTarget,
  project: string,
): Cypress.Chainable<MetricsCounts> => {
  const apiPath = `/api/v1/metrics/resource_counts?project=${encodeURIComponent(project)}`;

  const poll = (attempt: number, maxAttempts: number): Cypress.Chainable<MetricsCounts> =>
    execRegistryApi(target.namespace, target.deployName, target.container, apiPath).then((body) => {
      const { counts } = body;
      if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
        throw new Error(`Unexpected metrics response: ${JSON.stringify(body)}`);
      }
      const c = counts as Record<string, unknown>;
      const fields = [
        'features',
        'entities',
        'savedDatasets',
        'dataSources',
        'featureViews',
        'featureServices',
      ] as const;
      for (const f of fields) {
        if (typeof c[f] !== 'number') {
          throw new Error(`Missing or invalid "${f}" in counts: ${JSON.stringify(counts)}`);
        }
      }
      const result: MetricsCounts = {
        featureCount: c.features as number,
        entityCount: c.entities as number,
        datasetCount: c.savedDatasets as number,
        dataSourceCount: c.dataSources as number,
        featureViewCount: c.featureViews as number,
        featureServiceCount: c.featureServices as number,
      };

      const pending = [
        result.entityCount === 0 ? 'entity' : null,
        result.datasetCount === 0 ? 'dataset' : null,
      ].filter(Boolean);

      if (pending.length > 0 && attempt < maxAttempts) {
        cy.log(`Metrics ${pending.join(' and ')} count still 0; retry ${attempt}/${maxAttempts}`);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(2000).then(() => poll(attempt + 1, maxAttempts));
      }
      cy.log(`Metrics resource counts: ${JSON.stringify(result)}`);
      return cy.wrap(result);
    });

  return poll(1, 5);
};

const getCountFromEndpoint = (
  target: RegistryTarget,
  project: string,
  endpoint: string,
  responseKey: string,
): Cypress.Chainable<number> => {
  const apiPath = `/api/v1/${endpoint}?project=${encodeURIComponent(
    project,
  )}&allow_cache=true&include_relationships=false`;
  return execRegistryApi(target.namespace, target.deployName, target.container, apiPath).then(
    (body) => {
      const items = body[responseKey] as unknown[] | undefined;
      if (!Array.isArray(items)) {
        throw new Error(`Missing "${responseKey}" in response: ${JSON.stringify(body)}`);
      }
      cy.log(`${endpoint} count: ${items.length}`);
      return cy.wrap(items.length);
    },
  );
};

export const getAllFeatureStoreCounts = (
  target: RegistryTarget,
  project: string,
): Cypress.Chainable<MetricsCounts> => {
  return getCountFromEndpoint(target, project, 'feature_views', 'featureViews').then(
    (featureViewCount) => {
      const fetchFeatures = (attempt = 1, maxAttempts = 5): Cypress.Chainable<number> =>
        getCountFromEndpoint(target, project, 'features', 'features').then((count) => {
          if (count === 0 && featureViewCount > 0 && attempt < maxAttempts) {
            cy.log(
              `Feature count still 0 with ${featureViewCount} feature views; retry ${attempt}/${maxAttempts}`,
            );
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            return cy.wait(1000).then(() => fetchFeatures(attempt + 1, maxAttempts));
          }
          return cy.wrap(count);
        });

      return fetchFeatures().then((featureCount) => {
        return getCountFromEndpoint(target, project, 'entities', 'entities').then((entityCount) => {
          return getCountFromEndpoint(target, project, 'saved_datasets', 'savedDatasets').then(
            (datasetCount) => {
              return getCountFromEndpoint(target, project, 'data_sources', 'dataSources').then(
                (dataSourceCount) => {
                  return getCountFromEndpoint(
                    target,
                    project,
                    'feature_services',
                    'featureServices',
                  ).then((featureServiceCount) => {
                    const allCounts: MetricsCounts = {
                      featureCount,
                      entityCount,
                      datasetCount,
                      dataSourceCount,
                      featureViewCount,
                      featureServiceCount,
                    };
                    cy.log(`All Feature Store counts: ${JSON.stringify(allCounts)}`);
                    return cy.wrap(allCounts);
                  });
                },
              );
            },
          );
        });
      });
    },
  );
};
