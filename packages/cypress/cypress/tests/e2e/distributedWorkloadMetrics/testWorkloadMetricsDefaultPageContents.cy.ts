import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  globalDistributedWorkloads,
  projectMetricsTab,
  distributedWorkloadStatusTab,
} from '../../../pages/distributedWorkloads';
import {
  createKueueResources,
  deleteKueueResources,
} from '../../../utils/oc_commands/distributedWorkloads';
import { isKueueUnmanaged } from '../../../utils/oc_commands/dsc';
import type { WorkloadMetricsTestData } from '../../../types';
import { retryableBefore } from '../../../utils/retryableHooks';
import {
  findRefreshIntervalList,
  verifyRequestedResources,
} from '../../../utils/workloadMetricsUtils';
import { generateTestUUID } from '../../../utils/uuidGenerator';

// Note: In order to run this tests the following cluster configuration is required:
// - kueue set to Unmanaged in the DSC
// - Kueue Operator installed in cluster

describe('Verify Workload Metrics Default page Contents', () => {
  let testData: WorkloadMetricsTestData;
  let projectName: string;
  const uuid = generateTestUUID();
  let skipTest = false;

  retryableBefore(() => {
    // Check if Kueue is set to Unmanaged in the DSC
    cy.step('Check if Kueue is set to Unmanaged in the DSC');
    isKueueUnmanaged().then((isUnmanaged) => {
      if (!isUnmanaged) {
        cy.log('Kueue is not set to Unmanaged in the DSC. Skipping tests.');
        skipTest = true;
        return;
      }

      cy.fixture('e2e/workloadMetricsResources/testWorkloadMetricsResources.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as WorkloadMetricsTestData;
          projectName = `${testData.projectName}-${uuid}`;
        })
        .then(() => {
          cy.log('Creating Namespace ${projectName}');
          createCleanProject(projectName);

          cy.log('Creating Kueue resources');
          createKueueResources(
            testData.resourceFlavour,
            testData.clusterQueue,
            testData.localQueue,
            projectName,
            testData.cpuQuota,
            testData.memoryQuota,
          );
        });
    });
  });

  after(() => {
    if (skipTest) {
      cy.log('Skipping cleanup: Tests were skipped');
      return;
    }

    // Cleanup resources (testData and projectName are guaranteed to be defined
    // if skipTest is false, as the setup code would have run)
    cy.log('Deleting Kueue resources');
    deleteKueueResources(
      testData.localQueue,
      testData.clusterQueue,
      testData.resourceFlavour,
      projectName,
      { wait: false, ignoreNotFound: true },
    );
    cy.log('Deleting Namespace ${projectName}');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify Workload Metrics Home page Contents',
    { tags: ['@Sanity', '@SanitySet3', '@WorkloadMetrics'] },
    () => {
      if (skipTest) {
        cy.log('Skipping test: Kueue is not set to Unmanaged in the DSC');
        return;
      }

      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Workload metrics page and select project ${projectName} `);
      globalDistributedWorkloads.navigate();
      globalDistributedWorkloads.selectProjectByName(projectName);

      cy.step(`Verify the workload metrics default Home page contents exists`);
      cy.contains('Monitor the metrics of your active resources.').should('be.visible');
      projectMetricsTab.findProjectMetricsButton().should('be.visible');
      distributedWorkloadStatusTab.findDistributedWorkloadStatusButton().should('be.visible');
      findRefreshIntervalList().should('deep.equal', testData.refreshIntervals);
    },
  );

  it(
    'Verify Project Metrics Default Page contents',
    { tags: ['@Sanity', '@SanitySet3', '@WorkloadMetrics'] },
    () => {
      if (skipTest) {
        cy.log('Skipping test: Kueue is not set to Unmanaged in the DSC');
        return;
      }

      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project Metrics page and select project ${projectName} `);
      globalDistributedWorkloads.navigate();
      globalDistributedWorkloads.selectProjectByName(projectName);
      projectMetricsTab.navigateProjectMetricsPage();

      cy.step(`Verify the Project Metrics Default Page contents exists`);
      cy.contains('Requested resources').should('be.visible');
      verifyRequestedResources(projectName, testData.cpuQuota, testData.memoryQuota, 0, 0);
      projectMetricsTab
        .getRequestedResourcesTooltipText(0)
        .should('equal', `Total shared quota: ${testData.cpuQuota} cores`);
      projectMetricsTab
        .getRequestedResourcesTooltipText(7)
        .should('equal', `Total shared quota: ${testData.memoryQuota} GiB`);
      cy.findByTestId('dw-top-consuming-workloads')
        .should('be.visible')
        .and('contain', 'Top 5 resource-consuming workload metrics')
        .and('contain', 'No workload metrics')
        .and(
          'contain',
          'No workload metrics in the selected project are currently consuming resources.',
        );

      cy.findByTestId('dw-workload-resource-metrics')
        .should('be.visible')
        .and('contain', 'Distributed workload resource metrics')
        .and('contain', 'No workload metrics')
        .and(
          'contain',
          'No workload metrics in the selected project are currently consuming resources.',
        );
    },
  );

  it(
    'Verify Distributed Workload status Default Page contents',
    { tags: ['@Sanity', '@SanitySet3', '@WorkloadMetrics'] },
    () => {
      if (skipTest) {
        cy.log('Skipping test: Kueue is not set to Unmanaged in the DSC');
        return;
      }

      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(
        `Navigate to the Distributed Workload status page and select project ${projectName} `,
      );
      globalDistributedWorkloads.navigate();
      globalDistributedWorkloads.selectProjectByName(projectName);
      distributedWorkloadStatusTab.navigateDistributedWorkloadStatusPage();

      cy.step(`Verify the Distributed Workload status Default Page contents exists `);
      cy.findByTestId('dw-status-overview-card')
        .should('be.visible')
        .and('contain', 'Status overview')
        .and('contain', 'No workload metrics')
        .and(
          'contain',
          'Select another project or create a distributed workload in the selected project.',
        );

      cy.findByTestId('dw-workloads-table-card')
        .should('be.visible')
        .and('contain', 'Workload metrics')
        .and('contain', 'No workload metrics')
        .and(
          'contain',
          'Select another project or create a distributed workload in the selected project.',
        );
    },
  );
});
