import { execWithOutput } from './baseCommands';
import type { CommandLineResult } from '../../types';

type DSC = Record<string, unknown>;

type DashboardComponent = {
  standard?: {
    managementState?: string;
  };
  maasPortal?: Record<string, unknown>;
};

type DscResource = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    components?: {
      dashboard?: DashboardComponent;
    };
  };
};

export type MaaSPortalDscSnapshot = {
  name: string;
  namespace?: string;
  standardManagementState?: string;
  maasPortal?: Record<string, unknown>;
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const dscResourceArgs = (dsc: MaaSPortalDscSnapshot): string =>
  `${shellQuote(dsc.name)}${dsc.namespace ? ` -n ${shellQuote(dsc.namespace)}` : ''}`;

const getDSC = (): Cypress.Chainable<DSC | null> => {
  const ocCommand = 'oc get datasciencecluster -o json';
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.exitCode !== 0 || !result.stdout) {
      cy.log('Failed to retrieve DSC or DSC not found.');
      return cy.wrap(null as DSC | null);
    }

    try {
      const dscList = JSON.parse(result.stdout);
      const dsc = (dscList.items?.[0] || dscList) as DSC;
      return cy.wrap(dsc as DSC | null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`Error parsing DSC JSON: ${errorMessage}`);
      return cy.wrap(null as DSC | null);
    }
  });
};

const getDSCComponentState = (
  dsc: Record<string, unknown>,
  componentName: string,
): string | undefined => {
  const spec = dsc.spec as Record<string, unknown> | undefined;
  const components = spec?.components as Record<string, Record<string, unknown>> | undefined;
  return components?.[componentName]?.managementState as string | undefined;
};

/**
 * Check if Kueue is set to Unmanaged in the DataScienceCluster.
 * @returns A Cypress chainable that resolves to true if Kueue is Unmanaged, false otherwise.
 */
export const isKueueUnmanaged = (): Cypress.Chainable<boolean> =>
  getDSC().then((dsc) => {
    if (!dsc) {
      return cy.wrap(false);
    }

    const kueueManagementState = getDSCComponentState(dsc, 'kueue');
    const isUnmanaged = kueueManagementState === 'Unmanaged';

    if (isUnmanaged) {
      cy.log('Kueue is set to Unmanaged in the DSC.');
    } else {
      cy.log(
        `Kueue managementState is '${kueueManagementState || 'undefined'}', expected 'Unmanaged'.`,
      );
    }

    return cy.wrap(isUnmanaged);
  });

/**
 * Check if the Trainer component is set to Managed in the DataScienceCluster.
 * @returns A Cypress chainable that resolves to true if Trainer is Managed, false otherwise.
 */
export const isTrainerManaged = (): Cypress.Chainable<boolean> =>
  getDSC().then((dsc) => {
    if (!dsc) {
      return cy.wrap(false);
    }

    const trainerManagementState = getDSCComponentState(dsc, 'trainer');
    const isManaged = trainerManagementState === 'Managed';

    if (isManaged) {
      cy.log('Trainer is set to Managed in the DSC.');
    } else {
      cy.log(
        `Trainer managementState is '${
          trainerManagementState || 'undefined'
        }', expected 'Managed'.`,
      );
    }

    return cy.wrap(isManaged);
  });

/**
 * Configure the real RHOAI DSC for the portal-only browser journey.
 * The caller must restore the returned snapshot in its cleanup hook.
 */
export const configureMaaSPortalOnly = (): Cypress.Chainable<MaaSPortalDscSnapshot> =>
  getDSC().then((rawDsc) => {
    const dsc = rawDsc as DscResource | null;
    const dashboard = dsc?.spec?.components?.dashboard;
    const name = dsc?.metadata?.name;

    if (!dsc || !name || !dashboard?.standard) {
      throw new Error(
        'A DSC v3 resource with spec.components.dashboard.standard is required for the MaaS Portal E2E',
      );
    }

    const snapshot: MaaSPortalDscSnapshot = {
      name,
      namespace: dsc.metadata?.namespace,
      standardManagementState: dashboard.standard.managementState,
      maasPortal: dashboard.maasPortal,
    };
    const patch = {
      spec: {
        components: {
          dashboard: {
            standard: { managementState: 'Removed' },
            maasPortal: { managementState: 'Managed' },
          },
        },
      },
    };

    return cy
      .exec(
        `oc patch datasciencecluster ${dscResourceArgs(snapshot)} --type=merge -p ${shellQuote(
          JSON.stringify(patch),
        )}`,
        { failOnNonZeroExit: false },
      )
      .then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(`Failed to configure portal-only DSC: ${result.stderr || result.stdout}`);
        }
        cy.log('Configured DSC with dashboard.standard=Removed and maasPortal=Managed');
        return cy.wrap(snapshot);
      });
  });

/** Wait for the Dashboard operator to expose the portal-only state on a real cluster. */
export const waitForMaaSPortalOnlyInstall = (
  applicationsNamespace: string,
  snapshot: MaaSPortalDscSnapshot,
): Cypress.Chainable<string> =>
  execWithOutput(
    `oc wait datasciencecluster ${dscResourceArgs(
      snapshot,
    )} --for=jsonpath='{.spec.components.dashboard.standard.managementState}'=Removed --timeout=600s --output=name`,
    610,
  )
    .then((dashboardStateResult) => {
      if (dashboardStateResult.exitCode !== 0) {
        throw new Error(
          `DataScienceCluster dashboard.standard managementState did not become Removed: ${
            dashboardStateResult.stderr || dashboardStateResult.stdout
          }`,
        );
      }
      return execWithOutput(
        `oc wait datasciencecluster ${dscResourceArgs(
          snapshot,
        )} --for=jsonpath='{.spec.components.dashboard.maasPortal.managementState}'=Managed --timeout=600s --output=name`,
        610,
      );
    })
    .then((portalStateResult) => {
      if (portalStateResult.exitCode !== 0) {
        throw new Error(
          `DataScienceCluster MaaS Portal managementState did not become Managed: ${
            portalStateResult.stderr || portalStateResult.stdout
          }`,
        );
      }
      return execWithOutput(
        'oc wait dashboards.components.platform.opendatahub.io/default-dashboard --for=condition=MaaSPortalAvailable --timeout=600s --output=name',
        610,
      );
    })
    .then((conditionResult) => {
      if (conditionResult.exitCode !== 0) {
        throw new Error(
          `Dashboard did not report MaaSPortalAvailable: ${
            conditionResult.stderr || conditionResult.stdout
          }`,
        );
      }
      return cy
        .exec('oc get dashboards.components.platform.opendatahub.io/default-dashboard -o json', {
          failOnNonZeroExit: true,
        })
        .then((dashboardResult) => {
          const dashboard = JSON.parse(dashboardResult.stdout) as {
            status?: { maasPortalUrl?: string };
          };
          const portalUrl = dashboard.status?.maasPortalUrl?.trim();
          if (!portalUrl) {
            throw new Error('Dashboard status.maasPortalUrl is empty');
          }
          return cy
            .exec(`oc get datasciencecluster ${dscResourceArgs(snapshot)} -o json`, {
              failOnNonZeroExit: true,
            })
            .then((dscResult) => {
              const dsc = JSON.parse(dscResult.stdout) as DscResource;
              const dashboardSpec = dsc.spec?.components?.dashboard;
              const standardState = dashboardSpec?.standard?.managementState ?? 'unset';
              const portalManagementState = dashboardSpec?.maasPortal?.managementState;
              const portalState =
                typeof portalManagementState === 'string' ? portalManagementState : 'unset';
              if (standardState !== 'Removed' || portalState !== 'Managed') {
                throw new Error(
                  `DataScienceCluster does not reflect dashboard.standard=Removed and maasPortal=Managed (got standard=${standardState}, maasPortal=${portalState})`,
                );
              }
              return cy
                .exec(`oc get deployment -n ${shellQuote(applicationsNamespace)} -o json`, {
                  failOnNonZeroExit: true,
                })
                .then((deploymentResult) => {
                  const deployments = JSON.parse(deploymentResult.stdout) as {
                    items?: Array<{ metadata?: { name?: string } }>;
                  };
                  const deploymentNames = (deployments.items ?? [])
                    .map((deployment) => deployment.metadata?.name)
                    .filter((name): name is string => Boolean(name));
                  const coreDeployments = deploymentNames.filter(
                    (name) => name === 'odh-dashboard' || name === 'rhods-dashboard',
                  );
                  if (coreDeployments.length > 0) {
                    throw new Error(
                      `Core Dashboard Deployment(s) still exist in ${applicationsNamespace}: ${coreDeployments.join(
                        ', ',
                      )}`,
                    );
                  }
                  if (!deploymentNames.includes('maas-portal')) {
                    throw new Error(
                      `MaaS Portal Deployment is missing from ${applicationsNamespace}: expected maas-portal`,
                    );
                  }
                  cy.log('Verified portal-only install: no core Dashboard Deployment exists');
                  return cy.wrap(portalUrl);
                });
            });
        });
    });

/** Restore the DSC state captured by configureMaaSPortalOnly. */
export const restoreDsc = (snapshot: MaaSPortalDscSnapshot): Cypress.Chainable<null> => {
  const patch = {
    spec: {
      components: {
        dashboard: {
          standard: { managementState: snapshot.standardManagementState ?? null },
          maasPortal: snapshot.maasPortal ?? null,
        },
      },
    },
  };

  return cy
    .exec(
      `oc patch datasciencecluster ${dscResourceArgs(snapshot)} --type=merge -p ${shellQuote(
        JSON.stringify(patch),
      )}`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to restore DSC after MaaS Portal E2E: ${result.stderr || result.stdout}`,
        );
      }
      cy.log('Restored the original DSC dashboard.standard and MaaS Portal management states');
      return cy.wrap(null);
    });
};
