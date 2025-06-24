import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * Interface for learning resource counts
 */
interface LearningResourceCounts {
  documents: number;
  quickstarts: number;
  applications: number;
  dynamicDocs: number;
  total: number;
}

/**
 * Get all ODH documents from the cluster
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with parsed document items
 */
export const getOdhDocuments = (
  namespace = applicationNamespace,
): Cypress.Chainable<{ spec?: { type?: string }; [key: string]: unknown }[]> => {
  const ocCommand = `oc get odhdocuments.dashboard.opendatahub.io -n ${namespace} -o json`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Failed to get ODH documents: ${result.stderr}`);
      return [];
    }
    const jsonResponse = JSON.parse(result.stdout);
    return jsonResponse.items || [];
  });
};

/**
 * Get all ODH quickstarts from the cluster
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with parsed quickstart items
 */
export const getOdhQuickstarts = (
  namespace = applicationNamespace,
): Cypress.Chainable<{ [key: string]: unknown }[]> => {
  const ocCommand = `oc get odhquickstarts.console.openshift.io -n ${namespace} -o json`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Failed to get ODH quickstarts: ${result.stderr}`);
      return [];
    }
    const jsonResponse = JSON.parse(result.stdout);
    return jsonResponse.items || [];
  });
};

/**
 * Get all ODH applications from the cluster
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with parsed application items
 */
export const getOdhApplications = (
  namespace = applicationNamespace,
): Cypress.Chainable<
  { spec?: { docsLink?: string; isEnabled?: boolean }; [key: string]: unknown }[]
> => {
  const ocCommand = `oc get odhapplications.dashboard.opendatahub.io -n ${namespace} -o json`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Failed to get ODH applications: ${result.stderr}`);
      return [];
    }
    const jsonResponse = JSON.parse(result.stdout);
    return jsonResponse.items || [];
  });
};

/**
 * Get count of enabled learning resources (all resources show as enabled in UI)
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with total enabled resource count
 */
export const getEnabledResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getLearningResourceCounts(namespace).then((counts) => {
    cy.log(`Enabled resources count: ${counts.total}`);
    return cy.wrap(counts.total);
  });
};

/**
 * Get count of disabled learning resources (always 0 since all resources show as enabled)
 * @returns Cypress chainable with disabled resource count (always 0)
 */
export const getDisabledResourceCount = (): Cypress.Chainable<number> => {
  // In the learning center, all resources appear as enabled regardless of application settings
  // So disabled count is always 0
  const disabledCount = 0;

  cy.log(`Disabled applications count: ${disabledCount}`);
  return cy.wrap(disabledCount);
};

/**
 * Get count of documentation resources (static + dynamic)
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with documentation resource count
 */
export const getDocumentationResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getOdhDocuments(namespace).then((documents) => {
    return getOdhApplications(namespace).then((applications) => {
      const staticDocs = documents.filter(
        (doc: { spec?: { type?: string } }) => doc.spec && doc.spec.type === 'documentation',
      ).length;

      const dynamicDocs = applications.filter(
        (app: { spec?: { docsLink?: string } }) => app.spec && app.spec.docsLink,
      ).length;

      const totalDocs = staticDocs + dynamicDocs;

      cy.log(`Documentation resources count: ${totalDocs}`);
      return cy.wrap(totalDocs);
    });
  });
};

/**
 * Get count of how-to resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with how-to resource count
 */
export const getHowToResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getOdhDocuments(namespace).then((documents) => {
    const howtoResources = documents.filter(
      (doc: { spec?: { type?: string } }) => doc.spec && doc.spec.type === 'how-to',
    );

    cy.log(`How-to resources count: ${howtoResources.length}`);
    return cy.wrap(howtoResources.length);
  });
};

/**
 * Get count of quickstart resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with quickstart resource count
 */
export const getQuickstartResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getLearningResourceCounts(namespace).then((counts) => {
    cy.log(`Quickstart resources count: ${counts.quickstarts}`);
    return cy.wrap(counts.quickstarts);
  });
};

/**
 * Get count of tutorial resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with tutorial resource count
 */
export const getTutorialResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getOdhDocuments(namespace).then((documents) => {
    const tutorialResources = documents.filter(
      (doc: { spec?: { type?: string } }) => doc.spec && doc.spec.type === 'tutorial',
    );

    cy.log(`Tutorial resources count: ${tutorialResources.length}`);
    return cy.wrap(tutorialResources.length);
  });
};

/**
 * Get count of Red Hat managed resources (all resources show as Red Hat managed in UI)
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Red Hat managed resource count
 */
export const getRedHatManagedResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  // Red Hat managed count is identical to enabled count - all resources appear as Red Hat managed
  return getEnabledResourceCount(namespace).then((enabledCount) => {
    cy.log(`Red Hat managed resources count: ${enabledCount}`);
    return cy.wrap(enabledCount);
  });
};

/**
 * Get comprehensive learning resource counts
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with detailed resource counts
 */
export const getLearningResourceCounts = (
  namespace = applicationNamespace,
): Cypress.Chainable<LearningResourceCounts> => {
  return getOdhDocuments(namespace).then((documents) => {
    return getOdhQuickstarts(namespace).then((quickstarts) => {
      return getOdhApplications(namespace).then((applications) => {
        const dynamicDocs = applications.filter(
          (app: { spec?: { docsLink?: string } }) => app.spec && app.spec.docsLink,
        ).length;

        const counts: LearningResourceCounts = {
          documents: documents.length,
          quickstarts: quickstarts.length,
          applications: applications.length,
          dynamicDocs,
          total: documents.length + quickstarts.length + dynamicDocs,
        };

        return cy.wrap(counts);
      });
    });
  });
};

/**
 * Get count of resources for a specific provider
 * @param providerName - Name of the provider to count resources for
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with resource count for the provider
 */
export const getResourceCountByProvider = (
  providerName: string,
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getOdhApplications(namespace).then((applications) => {
    return getOdhDocuments(namespace).then((documents) => {
      let count = 0;

      // Find applications for this provider
      const providerApps = applications.filter((app) => {
        const appSpec = app.spec as { provider?: string };
        return appSpec.provider === providerName;
      });

      // Count documents linked to these applications
      providerApps.forEach((app) => {
        const appName = (app.metadata as { name?: string }).name;
        const appSpec = app.spec as { docsLink?: string };

        // Count linked documents
        const linkedDocs = documents.filter((doc) => {
          const docSpec = doc.spec as { appName?: string };
          return docSpec.appName === appName;
        });
        count += linkedDocs.length;

        // Count dynamic docs (apps with docsLink)
        if (appSpec.docsLink) {
          count += 1;
        }
      });

      // Special case: quickstarts are typically associated with Red Hat
      if (providerName === 'Red Hat') {
        return getOdhQuickstarts(namespace).then((quickstarts) => {
          count += quickstarts.length;
          cy.log(`${providerName} resources count: ${count}`);
          return cy.wrap(count);
        });
      }

      cy.log(`${providerName} resources count: ${count}`);
      return cy.wrap(count);
    });
  });
};

/**
 * Get count of Elastic provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Elastic resource count
 */
export const getElasticResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('Elastic', namespace).then((count) => {
    cy.log(`Elastic resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of IBM provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with IBM resource count
 */
export const getIBMResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('IBM', namespace).then((count) => {
    cy.log(`IBM resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of Intel® provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Intel® resource count
 */
export const getIntelResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('Intel®', namespace).then((count) => {
    cy.log(`Intel® resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of NVIDIA provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with NVIDIA resource count
 */
export const getNVIDIAResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('NVIDIA', namespace).then((count) => {
    cy.log(`NVIDIA resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of Pachyderm provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Pachyderm resource count
 */
export const getPachydermResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('Pachyderm', namespace).then((count) => {
    cy.log(`Pachyderm resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of Red Hat provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Red Hat resource count
 */
export const getRedHatResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('Red Hat', namespace).then((count) => {
    cy.log(`Red Hat resources count: ${count}`);
    return cy.wrap(count);
  });
};

/**
 * Get count of Starburst provider resources
 * @param namespace - The namespace to search in
 * @returns Cypress chainable with Starburst resource count
 */
export const getStarburstResourceCount = (
  namespace = applicationNamespace,
): Cypress.Chainable<number> => {
  return getResourceCountByProvider('Starburst', namespace).then((count) => {
    cy.log(`Starburst resources count: ${count}`);
    return cy.wrap(count);
  });
};
