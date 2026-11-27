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

type DashboardResource = {
  spec?: {
    managementState?: string;
    maasPortal?: { managementState?: string };
  };
  status?: { maasPortalUrl?: string };
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

const dashboardResource = 'dashboards.components.platform.opendatahub.io/default-dashboard';

export const getRequiredApplicationsNamespace = (): string => {
  const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (
    typeof applicationsNamespace !== 'string' ||
    applicationsNamespace !== applicationsNamespace.trim() ||
    applicationsNamespace.length > 63 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(applicationsNamespace)
  ) {
    throw new Error(
      'APPLICATIONS_NAMESPACE must be a valid Kubernetes namespace without surrounding whitespace',
    );
  }
  return applicationsNamespace;
};

const waitForJsonPath = (
  resource: string,
  jsonPath: string,
  expectedValue: string,
  description: string,
): Cypress.Chainable<null> =>
  execWithOutput(
    `oc wait ${resource} --for=jsonpath='${jsonPath}'=${expectedValue} --timeout=600s --output=name`,
    610,
  ).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(`${description}: ${result.stderr || result.stdout}`);
    }
    return cy.wrap(null);
  });

const getDeploymentNames = (applicationsNamespace: string): Cypress.Chainable<string[]> =>
  cy
    .exec(`oc get deployment -n ${shellQuote(applicationsNamespace)} -o json`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(`Unable to list deployments: ${result.stderr || result.stdout}`);
      }
      const deployments = JSON.parse(result.stdout) as {
        items?: Array<{ metadata?: { name?: string } }>;
      };
      return cy.wrap(
        (deployments.items ?? [])
          .map((deployment) => deployment.metadata?.name)
          .filter((name): name is string => Boolean(name)),
      );
    });

const coreDashboardNames = (deploymentNames: string[]): string[] =>
  deploymentNames.filter((name) => name === 'odh-dashboard' || name === 'rhods-dashboard');

const waitForCoreDashboardDeploymentsRemoved = (
  applicationsNamespace: string,
): Cypress.Chainable<null> =>
  getDeploymentNames(applicationsNamespace).then((deploymentNames) =>
    coreDashboardNames(deploymentNames).reduce(
      (chain, deploymentName) =>
        chain.then(() =>
          execWithOutput(
            `oc wait deployment/${shellQuote(deploymentName)} -n ${shellQuote(
              applicationsNamespace,
            )} --for=delete --timeout=600s --output=name`,
            610,
          ).then((result) => {
            const output = result.stderr || result.stdout;
            if (result.exitCode !== 0 && !/not found/i.test(output)) {
              throw new Error(
                `Core Dashboard Deployment ${deploymentName} was not removed: ${output}`,
              );
            }
            return cy.wrap(null);
          }),
        ),
      cy.wrap(null),
    ),
  );

const waitForCoreDashboardDeploymentAvailable = (
  applicationsNamespace: string,
): Cypress.Chainable<null> =>
  getDeploymentNames(applicationsNamespace).then((deploymentNames) => {
    const coreDeployments = coreDashboardNames(deploymentNames);
    if (!coreDeployments.length) {
      throw new Error(
        `Core Dashboard Deployment was not recreated in ${applicationsNamespace} during DSC restore`,
      );
    }
    return coreDeployments.reduce(
      (chain, deploymentName) =>
        chain.then(() =>
          execWithOutput(
            `oc wait deployment/${shellQuote(deploymentName)} -n ${shellQuote(
              applicationsNamespace,
            )} --for=condition=Available --timeout=600s --output=name`,
            610,
          ).then((result) => {
            if (result.exitCode !== 0) {
              throw new Error(
                `Core Dashboard Deployment ${deploymentName} did not become Available: ${
                  result.stderr || result.stdout
                }`,
              );
            }
            return cy.wrap(null);
          }),
        ),
      cy.wrap(null),
    );
  });

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
  waitForJsonPath(
    `datasciencecluster ${dscResourceArgs(snapshot)}`,
    '{.spec.components.dashboard.standard.managementState}',
    'Removed',
    'DataScienceCluster dashboard.standard managementState did not become Removed',
  )
    .then(() =>
      waitForJsonPath(
        `datasciencecluster ${dscResourceArgs(snapshot)}`,
        '{.spec.components.dashboard.maasPortal.managementState}',
        'Managed',
        'DataScienceCluster MaaS Portal managementState did not become Managed',
      ),
    )
    .then(() =>
      waitForJsonPath(
        dashboardResource,
        '{.spec.managementState}',
        'Removed',
        'Dashboard managementState did not become Removed',
      ),
    )
    .then(() =>
      waitForJsonPath(
        dashboardResource,
        '{.spec.maasPortal.managementState}',
        'Managed',
        'Dashboard MaaS Portal managementState did not become Managed',
      ),
    )
    .then(() => waitForCoreDashboardDeploymentsRemoved(applicationsNamespace))
    .then(() =>
      execWithOutput(
        `oc wait ${dashboardResource} --for=condition=MaaSPortalAvailable=true --timeout=600s --output=name`,
        610,
      ).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Dashboard did not report MaaSPortalAvailable: ${result.stderr || result.stdout}`,
          );
        }
        return cy.wrap(null);
      }),
    )
    .then(() =>
      cy
        .exec(`oc get ${dashboardResource} -o json`, { failOnNonZeroExit: true })
        .then((dashboardResult) => {
          const dashboard = JSON.parse(dashboardResult.stdout) as DashboardResource;
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
              return getDeploymentNames(applicationsNamespace).then((deploymentNames) => {
                if (coreDashboardNames(deploymentNames).length > 0) {
                  throw new Error(
                    `Core Dashboard Deployment(s) still exist in ${applicationsNamespace}`,
                  );
                }
                if (!deploymentNames.includes('maas-portal')) {
                  throw new Error(
                    `MaaS Portal Deployment is missing in ${applicationsNamespace}: expected maas-portal`,
                  );
                }
                cy.log('Verified portal-only install: no core Dashboard Deployment exists');
                return cy.wrap(portalUrl);
              });
            });
        }),
    );

/** Restore the DSC state captured by configureMaaSPortalOnly. */
export const restoreDsc = (
  snapshot: MaaSPortalDscSnapshot,
  applicationsNamespace: string,
): Cypress.Chainable<null> => {
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
      const standardState = snapshot.standardManagementState;
      const portalManagementState = snapshot.maasPortal?.managementState;
      const restoredDashboard = standardState
        ? waitForJsonPath(
            dashboardResource,
            '{.spec.managementState}',
            standardState,
            'Dashboard standard managementState was not restored',
          )
        : cy.wrap(null);
      return restoredDashboard
        .then(() => {
          if (standardState !== 'Managed') {
            return cy.wrap(null);
          }
          return execWithOutput(
            `oc wait ${dashboardResource} --for=condition=Ready=true --timeout=600s --output=name`,
            610,
          ).then((dashboardResult) => {
            if (dashboardResult.exitCode !== 0) {
              throw new Error(
                `Dashboard did not become Ready after DSC restore: ${
                  dashboardResult.stderr || dashboardResult.stdout
                }`,
              );
            }
            return waitForCoreDashboardDeploymentAvailable(applicationsNamespace);
          });
        })
        .then(() => {
          if (typeof portalManagementState !== 'string') {
            return cy.wrap(null);
          }
          return waitForJsonPath(
            dashboardResource,
            '{.spec.maasPortal.managementState}',
            portalManagementState,
            'Dashboard MaaS Portal managementState was not restored',
          );
        })
        .then(() => {
          cy.log('Restored and reconciled the original DSC dashboard states');
          return cy.wrap(null);
        });
    });
};
