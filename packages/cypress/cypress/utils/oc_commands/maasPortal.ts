type PortalState = {
  name: string;
  previousState?: string;
  hadPortalSpec: boolean;
  appliedGeneration: number;
};

type DataScienceClusterResource = {
  metadata: { name: string; uid: string; generation: number; resourceVersion: string };
  spec?: { components?: { dashboard?: { maasPortal?: { managementState?: string } } } };
  status?: {
    phase?: string;
    observedGeneration?: number;
    conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
  };
};

type DashboardResource = {
  metadata: {
    name: string;
    generation: number;
    ownerReferences?: Array<{ kind: string; name: string; uid: string; controller?: boolean }>;
  };
  spec?: { gateway?: { domain?: string }; maasPortal?: { managementState?: string } };
  status?: {
    maasPortalUrl?: string;
    observedGeneration?: number;
    conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
  };
};

const dscResource = 'datascienceclusters.datasciencecluster.opendatahub.io';
const dashboardResource = 'dashboards.components.platform.opendatahub.io';
const portalStatePath = '/spec/components/dashboard/maasPortal/managementState';

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

const assertValidName = (name: string): void => {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) {
    throw new Error(`Invalid DataScienceCluster name: ${name}`);
  }
};

const patchPortalState = (
  name: string,
  operations: Array<{ op: string; path: string; value?: unknown }>,
  failOnNonZeroExit = true,
): Cypress.Chainable<Cypress.Exec> => {
  assertValidName(name);
  return cy.exec(
    `oc patch ${dscResource} ${name} --type=json -p='${JSON.stringify(operations)}' -o json`,
    { failOnNonZeroExit },
  );
};

export const prepareOpenShiftMaaSPortal = (
  onRestoreNeeded: (state: PortalState) => void,
): Cypress.Chainable<string> =>
  readDSC().then((dsc) =>
    readDashboard().then((dashboard) => {
      const { name, resourceVersion } = dsc.metadata;
      const isOwnedByDSC = dashboard.metadata.ownerReferences?.some(
        (owner) =>
          owner.controller === true &&
          owner.kind === 'DataScienceCluster' &&
          owner.name === name &&
          owner.uid === dsc.metadata.uid,
      );
      if (!isOwnedByDSC) {
        throw new Error(
          `Dashboard ${dashboard.metadata.name} is not owned by DataScienceCluster ${name}`,
        );
      }

      const portalSpec = dsc.spec?.components?.dashboard?.maasPortal;
      const previousState = portalSpec?.managementState;
      const hadPortalSpec = portalSpec !== undefined;
      const gatewayDomain = dashboard.spec?.gateway?.domain;
      if (!gatewayDomain || !/^[a-z0-9.-]+$/.test(gatewayDomain)) {
        throw new Error('Dashboard spec.gateway.domain is required for the MaaS Portal test');
      }
      if (previousState && previousState !== 'Managed' && previousState !== 'Removed') {
        throw new Error(`Unsupported MaaS Portal management state: ${previousState}`);
      }

      const expectedUrl = `https://${gatewayDomain}/maas-portal/`;
      const start = Date.now();
      let lastCondition = '';
      const poll = (): Cypress.Chainable<string> =>
        readDashboard().then((current) => {
          const condition = current.status?.conditions?.find(
            ({ type }) => type === 'MaaSPortalAvailable',
          );
          const conditionText = `${condition?.reason ?? 'Unknown'}: ${condition?.message ?? ''}`;
          if (conditionText !== lastCondition) {
            cy.log(`MaaS Portal readiness: ${conditionText}`);
            lastCondition = conditionText;
          }
          if (
            current.metadata.name === dashboard.metadata.name &&
            current.spec?.maasPortal?.managementState === 'Managed' &&
            current.status?.maasPortalUrl === expectedUrl &&
            condition?.status === 'True' &&
            current.status.observedGeneration === current.metadata.generation
          ) {
            return cy.wrap(expectedUrl);
          }
          if (Date.now() - start >= 600000) {
            throw new Error(
              `MaaS Portal did not become available at ${expectedUrl}: ${conditionText}`,
            );
          }
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- operator reconciliation
          return cy.wait(5000, { log: false }).then(poll);
        });

      if (previousState === 'Managed') {
        return poll();
      }

      const operations = [
        { op: 'test', path: '/metadata/resourceVersion', value: resourceVersion },
        previousState
          ? { op: 'replace', path: portalStatePath, value: 'Managed' }
          : hadPortalSpec
          ? { op: 'add', path: portalStatePath, value: 'Managed' }
          : {
              op: 'add',
              path: '/spec/components/dashboard/maasPortal',
              value: { managementState: 'Managed' },
            },
      ];
      return patchPortalState(name, operations).then(({ stdout }) => {
        const applied = JSON.parse(stdout) as DataScienceClusterResource;
        onRestoreNeeded({
          name,
          previousState,
          hadPortalSpec,
          appliedGeneration: applied.metadata.generation,
        });
        return poll();
      });
    }),
  );

export const restoreOpenShiftMaaSPortal = ({
  name,
  previousState,
  hadPortalSpec,
  appliedGeneration,
}: PortalState): Cypress.Chainable<Cypress.Exec> => {
  const operations = [
    { op: 'test', path: '/metadata/generation', value: appliedGeneration },
    { op: 'test', path: portalStatePath, value: 'Managed' },
    previousState
      ? { op: 'replace', path: portalStatePath, value: previousState }
      : {
          op: 'remove',
          path: hadPortalSpec ? portalStatePath : '/spec/components/dashboard/maasPortal',
        },
  ];
  return patchPortalState(name, operations, false);
};

/** Wait for both controllers to reconcile the restored setting before another spec uses the DSC. */
export const waitForRestoredOpenShiftMaaSPortal = (
  { name, previousState, appliedGeneration }: PortalState,
  restoredGeneration: number,
): Cypress.Chainable<null> => {
  const expectedState = previousState ?? 'Removed';
  const expectedPortalStatus = expectedState === 'Managed' ? 'True' : 'False';
  const start = Date.now();
  let lastStatus = '';

  const poll = (): Cypress.Chainable<null> =>
    readDSC().then((dsc) =>
      readDashboard().then((dashboard) => {
        const dscReady = dsc.status?.conditions?.find(({ type }) => type === 'Ready');
        const portalAvailable = dashboard.status?.conditions?.find(
          ({ type }) => type === 'MaaSPortalAvailable',
        );
        const status = `DSC phase=${dsc.status?.phase ?? 'Unknown'}, generation=${
          dsc.metadata.generation
        }/${dsc.status?.observedGeneration ?? 'Unknown'}, Ready=${
          dscReady?.status ?? 'Unknown'
        }; Dashboard generation=${dashboard.metadata.generation}/${
          dashboard.status?.observedGeneration ?? 'Unknown'
        }, Portal=${portalAvailable?.status ?? 'Unknown'} (${
          portalAvailable?.reason ?? 'Unknown'
        })`;
        if (status !== lastStatus) {
          cy.log(`MaaS Portal restore: ${status}`);
          lastStatus = status;
        }

        if (
          dsc.metadata.name === name &&
          dsc.metadata.generation >= appliedGeneration &&
          dsc.metadata.generation === restoredGeneration &&
          dsc.spec?.components?.dashboard?.maasPortal?.managementState === previousState &&
          dsc.status?.observedGeneration === restoredGeneration &&
          dsc.status.phase === 'Ready' &&
          dscReady?.status === 'True' &&
          dashboard.spec?.maasPortal?.managementState === expectedState &&
          dashboard.status?.observedGeneration === dashboard.metadata.generation &&
          portalAvailable?.status === expectedPortalStatus &&
          (expectedState === 'Managed' || portalAvailable.reason === 'Disabled')
        ) {
          return cy.wrap(null, { log: false });
        }
        if (Date.now() - start >= 600000) {
          throw new Error(`MaaS Portal state did not finish restoring: ${status}`);
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- operator reconciliation
        return cy.wait(5000, { log: false }).then(poll);
      }),
    );

  return poll();
};
