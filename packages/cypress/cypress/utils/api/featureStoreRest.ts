import type { RegistryTarget } from '../oc_commands/featureStoreResources';

const execRegistryApi = (
  namespace: string,
  deployName: string,
  container: string,
  apiPath: string,
): Cypress.Chainable<Record<string, unknown>> => {
  const cmd =
    `oc exec -n ${namespace} deploy/${deployName} -c ${container} -- ` +
    `sh -c 'curl -sk -H "Authorization: Bearer ` +
    `$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" ` +
    `"https://localhost:6573${apiPath}"'`;

  return cy.exec(cmd, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      throw new Error(`Registry API call failed (${apiPath}): ${result.stderr || result.stdout}`);
    }
    return cy.wrap(JSON.parse(result.stdout.trim()) as Record<string, unknown>);
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
      const counts = body.counts as Record<string, number> | undefined;
      if (!counts || typeof counts !== 'object') {
        throw new Error(`Unexpected metrics response: ${JSON.stringify(body)}`);
      }
      const result: MetricsCounts = {
        featureCount: counts.features,
        entityCount: counts.entities,
        datasetCount: counts.savedDatasets,
        dataSourceCount: counts.dataSources,
        featureViewCount: counts.featureViews,
        featureServiceCount: counts.featureServices,
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
