type DataScienceClusterResource = {
  spec?: { components?: { dashboard?: { maasPortal?: { managementState?: string } } } };
};

type DashboardResource = {
  status?: { maasPortalUrl?: string };
};

const dscResource = 'datascienceclusters.datasciencecluster.opendatahub.io';
const dashboardResource = 'dashboards.components.platform.opendatahub.io';

const readDSC = (): Cypress.Chainable<DataScienceClusterResource> =>
  cy.exec(`oc get ${dscResource} -o json`).then(({ stdout }) => {
    const list = JSON.parse(stdout) as { items?: DataScienceClusterResource[] };
    if (list.items?.length !== 1) {
      throw new Error(`Expected one DataScienceCluster; found ${list.items?.length ?? 0}`);
    }
    return list.items[0];
  });

const readDashboard = (): Cypress.Chainable<DashboardResource> =>
  cy.exec(`oc get ${dashboardResource} -o json`).then(({ stdout }) => {
    const list = JSON.parse(stdout) as { items?: DashboardResource[] };
    if (list.items?.length !== 1) {
      throw new Error(`Expected one Dashboard resource; found ${list.items?.length ?? 0}`);
    }
    return list.items[0];
  });

/** Read the already-enabled MaaS Portal URL without changing cluster state. */
export const getEnabledOpenShiftMaaSPortalUrl = (): Cypress.Chainable<string> =>
  readDSC().then((dsc) =>
    readDashboard().then((dashboard) => {
      const managementState = dsc.spec?.components?.dashboard?.maasPortal?.managementState;
      const portalUrl = dashboard.status?.maasPortalUrl;
      if (managementState !== 'Managed' || !portalUrl) {
        throw new Error(
          `MaaS Portal must already be enabled before this test (managementState=${
            managementState ?? 'unset'
          }, url=${portalUrl ?? 'unset'}). Enable it in the DataScienceCluster and rerun the test.`,
        );
      }
      return cy.wrap(portalUrl);
    }),
  );
