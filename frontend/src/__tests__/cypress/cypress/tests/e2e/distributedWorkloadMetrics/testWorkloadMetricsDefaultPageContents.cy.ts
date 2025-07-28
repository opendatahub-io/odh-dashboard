import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import {
  globalDistributedWorkloads,
  projectMetricsTab,
  distributedWorkloadStatusTab,
} from '#~/__tests__/cypress/cypress/pages/distributedWorkloads';
import {
  createKueueResources,
  deleteKueueResources,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/distributedWorkloads';
import type { WorkloadMetricsTestData } from '#~/__tests__/cypress/cypress/types';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  findRefreshIntervalList,
  verifyRequestedResources,
} from '#~/__tests__/cypress/cypress/utils/workloadMetricsUtils';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('[Product Bug: RHOAIENG-30510] Verify Workload Metrics Default page Contents', () => {
  let testData: WorkloadMetricsTestData;
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
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

  after(() => {
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
    { tags: ['@Sanity', '@SanitySet3', '@WorkloadMetrics', '@Bug'] },
    () => {
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
        .and('contain', 'Top 5 resource-consuming distributed workloads')
        .and('contain', 'No distributed workloads')
        .and(
          'contain',
          'No distributed workloads in the selected project are currently consuming resources.',
        );

      cy.findByTestId('dw-workload-resource-metrics')
        .should('be.visible')
        .and('contain', 'Distributed workload resource metrics')
        .and('contain', 'No distributed workloads')
        .and(
          'contain',
          'No distributed workloads in the selected project are currently consuming resources.',
        );
    },
  );

  it(
    'Verify Distributed Workload status Default Page contents',
    { tags: ['@Sanity', '@SanitySet3', '@WorkloadMetrics'] },
    () => {
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
        .and('contain', 'No distributed workloads')
        .and(
          'contain',
          'Select another project or create a distributed workload in the selected project.',
        );

      cy.findByTestId('dw-workloads-table-card')
        .should('be.visible')
        .and('contain', 'Distributed Workloads')
        .and('contain', 'No distributed workloads')
        .and(
          'contain',
          'Select another project or create a distributed workload in the selected project.',
        );
    },
  );
});
