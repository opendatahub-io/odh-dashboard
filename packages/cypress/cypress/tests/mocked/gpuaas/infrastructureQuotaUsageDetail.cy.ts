import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import {
  initIntercepts,
  nestedCohortQuotaUsageIntercepts,
  borrowingCohortQuotaUsageIntercepts,
  singleA100ClusterQueueIntercepts,
  type InitInterceptsOptions,
} from './infrastructureMocks';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { infrastructurePage } from '../../../pages/infrastructure';

const initKueueProjectsIntercepts = (clusterQueueName: string) => {
  const localQueue = mockLocalQueueK8sResource({
    name: 'user-queue',
    namespace: 'dsp-1',
  });
  localQueue.spec.clusterQueue = clusterQueueName;
  const project = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });
  const localQueueList = mockK8sResourceList([localQueue]);
  const projectList = mockK8sResourceList([project]);

  // Register after asClusterAdminUser catch-alls so modal fetches get real data.
  cy.intercept('GET', '**/apis/kueue.x-k8s.io/v1beta2/**/localqueues*', localQueueList).as(
    'listAllLocalQueues',
  );
  cy.intercept('GET', '**/apis/project.openshift.io/v1/projects*', projectList).as(
    'listModelServingProjects',
  );
};

const visitQuotaUsageTab = () => {
  infrastructurePage.visit();
  infrastructurePage.switchToQuotaUsageTab();
};

const initSingleGpuQuotaUsageIntercepts = (overrides: Partial<InitInterceptsOptions> = {}) => {
  initIntercepts({ ...singleA100ClusterQueueIntercepts, ...overrides });
};

const initBorrowingScenarioIntercepts = () => {
  initIntercepts({
    ...borrowingCohortQuotaUsageIntercepts,
    hasChartData: true,
    dcgmModelName: 'NVIDIA H100',
    dcgmComputePercent: 117,
    dcgmMemoryPercent: 117,
  });
};

describe('GPUaaS Infrastructure Page — Quota usage', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('should show empty state when no GPU cluster queues exist', () => {
    initIntercepts({ clusterQueues: [], cohortNames: [], resourceFlavors: [] });
    visitQuotaUsageTab();
    infrastructurePage
      .findQuotaUsageEmptyState()
      .should('exist')
      .and('contain.text', 'No accelerator cluster queues found');

    initIntercepts({
      clusterQueues: [
        {
          name: 'cq-cpu-only',
          cohortName: 'cohort-1',
          gpuFlavorName: undefined,
          hasResourceGroups: true,
        },
      ],
      cohortNames: ['cohort-1'],
      resourceFlavors: [],
    });
    visitQuotaUsageTab();
    infrastructurePage.findQuotaUsageEmptyState().should('exist');
  });

  it('should navigate nested cohort tree, breadcrumbs, unassigned queues, and search', () => {
    initIntercepts(nestedCohortQuotaUsageIntercepts);
    visitQuotaUsageTab();

    infrastructurePage.findQuotaUsageCollapseAll().should('exist');
    infrastructurePage.findQuotaUsageTreeNode('production').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('inference-edge').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('Unassigned').should('exist');

    infrastructurePage.findQuotaUsageTreeNode('prod-serving').click();
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'prod-serving');
    infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'production');
    infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'inference-edge');
    infrastructurePage.findQuotaUsageBreadcrumbSegment('production').click();
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'production');

    infrastructurePage.findQuotaUsageTreeNode('legacy-batch').click();
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'legacy-batch');
    infrastructurePage.findQuotaUsageTreeNode('production').click();
    infrastructurePage.findQuotaUsageNavSearch().type('prod-serving');
    infrastructurePage.findQuotaUsageTreeNode('prod-serving').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('legacy-batch').should('not.exist');
  });

  it('should render tree, cluster queue summary, and filter accelerator table rows', () => {
    initIntercepts({
      clusterQueues: [
        {
          name: 'cq-a100',
          cohortName: 'cohort-1',
          gpuFlavorName: 'a100-flavor',
          gpuNominalQuota: 8,
          gpuUsed: 5,
          admittedWorkloads: 2,
          pendingWorkloads: 1,
        },
        {
          name: 'cq-h100',
          cohortName: 'cohort-1',
          gpuFlavorName: 'h100-flavor',
          gpuNominalQuota: 4,
          gpuUsed: 2,
        },
      ],
      cohortNames: ['cohort-1'],
      resourceFlavors: [
        { name: 'a100-flavor', gpuProduct: 'NVIDIA A100' },
        { name: 'h100-flavor', gpuProduct: 'NVIDIA H100' },
      ],
      dcgmModelName: 'NVIDIA A100',
    });
    visitQuotaUsageTab();

    infrastructurePage
      .findQuotaUsageDescription()
      .should('contain.text', 'View quota usage across cluster queues');
    infrastructurePage.findQuotaUsageTreeNode('cohort-1').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('cq-a100').should('exist');
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'cohort-1');
    infrastructurePage.findQuotaUsageCollapseAll().should('exist');

    infrastructurePage.findQuotaUsageTreeNode('cq-a100').click();
    infrastructurePage.findQuotaUsageSummarySection().should('exist');
    infrastructurePage
      .findQuotaUsageSummaryWorkloads()
      .should('contain.text', '2 active, 1 pending');
    infrastructurePage.findQuotaUsageSummaryCapacity().should('contain.text', '5/8 accelerators');
    infrastructurePage.findQuotaUsageSummaryCompute().should('contain.text', '30%');
    infrastructurePage.findQuotaUsageSummaryMemory().should('contain.text', '35%');
    infrastructurePage.findQuotaUsageAcceleratorTableSection().should('exist');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA A100').should('exist');
    infrastructurePage.findQuotaUsageMeterCapacity('NVIDIA A100').should('contain.text', '5/8');

    infrastructurePage.findQuotaUsageTreeNode('cohort-1').click();
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA A100').should('exist');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA H100').should('exist');
    infrastructurePage.findQuotaUsageAcceleratorTableSearch().type('H100');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA A100').should('not.exist');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA H100').should('exist');
  });

  it('should show 0% utilization meters when DCGM is unavailable', () => {
    initSingleGpuQuotaUsageIntercepts({ hasDcgm: false });
    visitQuotaUsageTab();
    infrastructurePage.findQuotaUsageTreeNode('cq-gpu').click();

    infrastructurePage.findQuotaUsageSummaryCompute().should('contain.text', '0%');
    infrastructurePage.findQuotaUsageSummaryMemory().should('contain.text', '0%');
    infrastructurePage.findQuotaUsageMeterCompute('NVIDIA A100').should('contain.text', '0%');
    infrastructurePage.findQuotaUsageMeterMemory('NVIDIA A100').should('contain.text', '0%');
  });

  it('should preserve quota data when DCGM request fails', () => {
    initSingleGpuQuotaUsageIntercepts({ dcgmRequestError: true });
    visitQuotaUsageTab();
    infrastructurePage.findQuotaUsageTreeNode('cq-gpu').click();

    infrastructurePage
      .findQuotaUsageDetailPartialError()
      .should('contain.text', 'Some usage telemetry is unavailable');
    infrastructurePage.findQuotaUsageSummaryCapacity().should('contain.text', '5/8 accelerators');
    infrastructurePage.findQuotaUsageAcceleratorTableSection().should('exist');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA A100').should('exist');
    cy.findByTestId('quota-usage-accelerator-table-error').should('not.exist');
  });

  it('should open Kueue projects modal from cluster queue detail', () => {
    initSingleGpuQuotaUsageIntercepts();
    initKueueProjectsIntercepts('cq-gpu');
    visitQuotaUsageTab();
    infrastructurePage.findQuotaUsageTreeNode('cq-gpu').click();

    initKueueProjectsIntercepts('cq-gpu');
    infrastructurePage.findQuotaUsageViewKueueProjectsLink().should('exist').click();
    infrastructurePage.findKueueProjectsModal().should('exist');
    cy.wait('@listAllLocalQueues');
    cy.wait('@listModelServingProjects');
    cy.findByTestId('kueue-projects-table').should('exist');
    infrastructurePage.findKueueProjectsRow('dsp-1').should('exist');
    infrastructurePage.findKueueProjectsCloseButton().click();
    infrastructurePage.findKueueProjectsModal().should('not.exist');
  });

  it('should hide borrowing UX when no cluster queue is borrowing', () => {
    initIntercepts(nestedCohortQuotaUsageIntercepts);
    visitQuotaUsageTab();
    infrastructurePage.findQuotaUsageTreeNode('production').click();

    infrastructurePage.findQuotaUsageBorrowingEnabledBadge().should('not.exist');
    infrastructurePage.findQuotaUsageBorrowingClusterQueueList().should('not.exist');
    infrastructurePage.findQuotaUsageBorrowingLink().should('not.exist');
  });

  it('should show borrowing badge, callout, over-quota detail, popover, and navigation', () => {
    initBorrowingScenarioIntercepts();
    visitQuotaUsageTab();

    infrastructurePage.findQuotaUsageTreeNode('production').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('platform-production').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('prod-serving').should('exist');
    infrastructurePage.findQuotaUsageTreeNode('high-priority-compute').should('exist');

    infrastructurePage.findQuotaUsageTreeNode('production').click();
    infrastructurePage.findQuotaUsageBorrowingEnabledBadge().should('exist');
    infrastructurePage
      .findQuotaUsageBorrowingClusterQueueLink('high-priority-compute')
      .should('exist');
    infrastructurePage.findQuotaUsageBorrowingLink().should('not.exist');

    infrastructurePage.findQuotaUsageTreeNode('platform-production').click();
    infrastructurePage.findQuotaUsageBorrowingEnabledBadge().should('exist');
    infrastructurePage
      .findQuotaUsageBorrowingClusterQueueList()
      .should('contain.text', 'high-priority-compute')
      .and('contain.text', 'platform-production accelerators');
    infrastructurePage.findQuotaUsageBorrowingLink().should('not.exist');

    infrastructurePage.findQuotaUsageTreeNode('high-priority-compute').click();
    infrastructurePage
      .findQuotaUsageSummaryWorkloads()
      .should('contain.text', '1 active, 1 pending')
      .and('contain.text', 'needs attention');
    infrastructurePage.findQuotaUsageSummaryCapacity().should('contain.text', '14/12 accelerators');
    infrastructurePage.findQuotaUsageSummaryCompute().should('contain.text', '117%');
    infrastructurePage.findQuotaUsageSummaryMemory().should('contain.text', '117%');
    infrastructurePage.findQuotaUsageSummaryCapacityOverQuota().should('exist');
    infrastructurePage.findQuotaUsageSummaryComputeOverQuota().should('exist');
    infrastructurePage.findQuotaUsageSummaryMemoryOverQuota().should('exist');
    infrastructurePage
      .findQuotaUsageBorrowingLink()
      .should('contain.text', 'Borrowing 2 platform-production accelerators');
    infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'platform-production');
    infrastructurePage.findQuotaUsageAcceleratorTableSection().should('exist');
    infrastructurePage.findQuotaUsageAcceleratorRow('NVIDIA H100').should('exist');
    infrastructurePage.findQuotaUsageMeterCapacity('NVIDIA H100').should('contain.text', '14/12');
    infrastructurePage.findQuotaUsageMeterCompute('NVIDIA H100').should('contain.text', '117%');
    infrastructurePage.findQuotaUsageMeterMemory('NVIDIA H100').should('contain.text', '117%');

    infrastructurePage.findQuotaUsageBorrowingLink().click();
    infrastructurePage
      .findOpenPopover()
      .should('contain.text', 'Borrowing:')
      .and('contain.text', '2 x NVIDIA H100')
      .and('contain.text', 'Since:');

    infrastructurePage.findQuotaUsageTreeNode('platform-production').click();
    infrastructurePage.findQuotaUsageBorrowingClusterQueueLink('high-priority-compute').click();
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'high-priority-compute');
    infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'production');
    infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'platform-production');
    infrastructurePage.findQuotaUsageBreadcrumbSegment('platform-production').click();
    infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'platform-production');
  });
});
