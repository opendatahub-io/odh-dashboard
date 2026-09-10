import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import type { WorkloadKind, WorkloadPodSet } from '@odh-dashboard/k8s-core';
import { WorkloadOwnerType } from '@odh-dashboard/k8s-core';
import { LocalQueueModel, WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { initIntercepts, type InitInterceptsOptions } from './infrastructureMocks';
import { PodModel, ProjectModel } from '../../../utils/models';
import { getK8sAPIResourceURL } from '../../../utils/k8s';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { infrastructurePage } from '../../../pages/infrastructure';

describe('GPUaaS Infrastructure Page', () => {
  it('should not be accessible for non-admin users', () => {
    asProjectAdminUser();
    initIntercepts();
    infrastructurePage.visit(false);
    infrastructurePage.findNavItem().should('not.exist');
    infrastructurePage.shouldNotFoundPage();
  });

  (
    [
      ['Kueue is not installed', { isKueueInstalled: false }],
      ['the gpuaas feature flag is disabled', { gpuaas: false }],
    ] as [string, InitInterceptsOptions][]
  ).forEach(([description, opts]) => {
    it(`page does not exist when ${description}`, () => {
      asClusterAdminUser();
      initIntercepts(opts);
      infrastructurePage.visit(false);
      infrastructurePage.findNavItem().should('not.exist');
      infrastructurePage.shouldNotFoundPage();
    });
  });

  describe('cluster summary cards', () => {
    it('should display correct card data and refresh badge when GPU data is available', () => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: true, hasDcgm: true });
      infrastructurePage.visit();
      infrastructurePage.findClusterSection().should('exist');
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', '11/16');
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', 'in use');
      infrastructurePage.findComputeUtilizationCard().should('contain.text', '80%');
      infrastructurePage.findMemoryUtilizationCard().should('contain.text', '83%');
      infrastructurePage.findRefreshBadge().should('exist');
      infrastructurePage.findRefreshBadge().should('contain.text', 'Updated');
    });

    it('should display empty states when no accelerators are present', () => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: false, hasDcgm: false });
      infrastructurePage.visit();
      infrastructurePage
        .findTotalAcceleratorsCard()
        .should('contain.text', 'No accelerator resources detected');
      infrastructurePage
        .findComputeUtilizationCard()
        .should('contain.text', 'Consumption metrics unavailable');
      infrastructurePage
        .findMemoryUtilizationCard()
        .should('contain.text', 'Consumption metrics unavailable');
    });

    it('should show accelerator data but empty utilization cards when DCGM is unavailable', () => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: true, hasDcgm: false });
      infrastructurePage.visit();
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', '11/16');
      infrastructurePage
        .findComputeUtilizationCard()
        .should('contain.text', 'Consumption metrics unavailable');
      infrastructurePage
        .findMemoryUtilizationCard()
        .should('contain.text', 'Consumption metrics unavailable');
    });
  });

  describe('Hardware usage section', () => {
    describe('with hardware model data', () => {
      beforeEach(() => {
        asClusterAdminUser();
        initIntercepts({ hasHardwareModels: true });
      });

      it('should display the chart with model names and legend', () => {
        infrastructurePage.visit();
        infrastructurePage.findHardwareUsageSection().should('exist');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'Hardware usage');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'NVIDIA H100');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'NVIDIA A100');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'NVIDIA L40S');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'AMD MI300X');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'In use');
        infrastructurePage.findHardwareUsageSection().should('contain.text', 'Available');
      });
    });

    it('should show empty state when no hardware model data is available', () => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: false, hasDcgm: false, hasHardwareModels: false });
      infrastructurePage.visit();
      infrastructurePage
        .findHardwareUsageEmpty()
        .should('contain.text', 'Hardware model information unavailable');
    });

    it('should fall back to node labels when DCGM hardware models are unavailable', () => {
      asClusterAdminUser();
      initIntercepts({
        hasDcgm: false,
        hasHardwareModels: false,
        hasNodeLabels: true,
      });
      infrastructurePage.visit();
      infrastructurePage.findHardwareUsageSection().should('contain.text', 'NVIDIA L40S');
      infrastructurePage.findHardwareUsageSection().should('contain.text', 'AMD MI300X');
    });
  });

  describe('Borrowing chart', () => {
    const cq1Opts = { name: 'cq-inference', cohortName: 'cohort-inference' };
    const cq2Opts = { name: 'cq-training', cohortName: 'cohort-inference' };
    const cohortName = 'cohort-inference';

    it('renders the chart, cohort filter, and CQ filter when data is present', () => {
      asClusterAdminUser();
      initIntercepts({
        hasChartData: true,
        clusterQueues: [cq1Opts, cq2Opts],
        cohortNames: [cohortName],
      });
      infrastructurePage.visit();

      infrastructurePage.findBorrowingChart().should('exist');

      infrastructurePage
        .findCohortSelect()
        .should('contain.text', 'All cohorts')
        .click({ force: true });
      cy.findByText('cohort-inference').should('exist');
      cy.findByText('Not in a cohort').should('exist');
      cy.get('body').click();

      // Filter by CQ name
      infrastructurePage.findCqNameFilter().type('training');
      infrastructurePage.findCountLabel().should('have.text', 'Showing 1 of 2 cluster queues');

      // Filter by cohort name: both CQs are in cohort-inference
      infrastructurePage.findCqNameFilter().clear();
      infrastructurePage.findCqNameFilter().type('cohort-inference');
      infrastructurePage.findCountLabel().should('have.text', 'Showing 2 of 2 cluster queues');
    });

    it('shows empty state when Prometheus returns no data', () => {
      asClusterAdminUser();
      initIntercepts({ hasChartData: false, clusterQueues: [cq1Opts], cohortNames: [cohortName] });
      infrastructurePage.visit();
      infrastructurePage.findBorrowingEmptyState().should('exist');
    });
  });

  describe('Cluster queue workloads section', () => {
    const PROJECT_D = 'project-d';
    const CLUSTER_QUEUE = 'burst-training';
    const LOCAL_QUEUE = 'large-model-jobs';
    const COHORT = 'ml-training';

    const gpuPodSet: WorkloadPodSet = {
      count: 1,
      name: 'main',
      template: {
        metadata: {},
        spec: {
          containers: [
            {
              name: 'main',
              image: 'test-image',
              env: [],
              resources: { requests: { 'nvidia.com/gpu': '2' } },
            },
          ],
        },
      },
    };

    const makeGpuWorkload = (name: string, mockStatus: WorkloadStatusType): WorkloadKind => ({
      ...mockWorkloadK8sResource({
        k8sName: name,
        namespace: PROJECT_D,
        ownerName: `${name}-owner`,
        ownerKind: WorkloadOwnerType.Job,
        mockStatus,
        podSets: [gpuPodSet],
      }),
      spec: {
        ...mockWorkloadK8sResource({
          k8sName: name,
          namespace: PROJECT_D,
          mockStatus,
          podSets: [gpuPodSet],
        }).spec,
        queueName: LOCAL_QUEUE,
      },
    });

    const pendingWorkload = makeGpuWorkload('llm-pretrain-run', WorkloadStatusType.Pending);
    const inadmissibleWorkload = makeGpuWorkload(
      'multimodal-trial',
      WorkloadStatusType.Inadmissible,
    );

    const initWorkloadIntercepts = ({
      workloads = [pendingWorkload, inadmissibleWorkload],
      workloadListError = false,
    }: {
      workloads?: WorkloadKind[];
      workloadListError?: boolean;
    } = {}) => {
      initIntercepts({
        clusterQueues: [
          {
            name: CLUSTER_QUEUE,
            cohortName: COHORT,
            gpuFlavorName: 'a100-flavor',
            gpuNominalQuota: 8,
          },
        ],
        cohortNames: ['research', { name: COHORT, parentName: 'research' }],
        resourceFlavors: [{ name: 'a100-flavor', gpuProduct: 'NVIDIA A100' }],
      });

      cy.interceptK8sList(
        ProjectModel,
        mockK8sResourceList([
          mockProjectK8sResource({
            k8sName: PROJECT_D,
            displayName: 'Project-D',
            enableKueue: true,
          }),
        ]),
      );

      cy.interceptK8sList({ model: PodModel, ns: PROJECT_D }, mockK8sResourceList([]));

      const projectDLocalQueue = {
        ...mockLocalQueueK8sResource({
          name: LOCAL_QUEUE,
          namespace: PROJECT_D,
        }),
        spec: { clusterQueue: CLUSTER_QUEUE },
      };

      // Cluster-wide LocalQueue index (listAllLocalQueues). interceptK8sList infers ns from mock
      // items and would register a namespaced path; listAllLocalQueues is cluster-scoped.
      cy.intercept(
        'GET',
        getK8sAPIResourceURL(LocalQueueModel),
        mockK8sResourceList([projectDLocalQueue]),
      );

      cy.interceptK8sList(
        { model: LocalQueueModel, ns: PROJECT_D },
        mockK8sResourceList([projectDLocalQueue]),
      );

      if (workloadListError) {
        cy.interceptK8sList({ model: WorkloadModel, ns: PROJECT_D }, { statusCode: 500 });
      } else {
        cy.interceptK8sList(
          { model: WorkloadModel, ns: PROJECT_D },
          mockK8sResourceList(workloads),
        );
      }

      cy.intercept(
        'GET',
        `/api/k8s/apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/${PROJECT_D}/localqueues/${LOCAL_QUEUE}/pendingworkloads`,
        {
          kind: 'PendingWorkloadsSummary',
          apiVersion: 'visibility.kueue.x-k8s.io/v1beta2',
          metadata: {},
          items: [
            {
              metadata: { name: 'llm-pretrain-run', namespace: PROJECT_D },
              priority: 0,
              localQueueName: LOCAL_QUEUE,
              positionInClusterQueue: 0,
              positionInLocalQueue: 0,
            },
          ],
        },
      );
    };

    beforeEach(() => {
      asClusterAdminUser();
    });

    it('should not show workloads section when a cohort is selected', () => {
      initWorkloadIntercepts();
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode(COHORT).click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', COHORT);
      infrastructurePage.findQuotaUsageWorkloadsSection().should('not.exist');
    });

    it('should show workloads table when a cluster queue is selected', () => {
      initWorkloadIntercepts();
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode(CLUSTER_QUEUE).click();
      infrastructurePage.findQuotaUsageWorkloadsSection().should('exist');
      infrastructurePage.findClusterQueueWorkloadsTable().should('exist');
      infrastructurePage
        .findClusterQueueWorkloadRow(PROJECT_D, 'llm-pretrain-run')
        .should('contain.text', 'Project-D')
        .and('contain.text', 'Queued')
        .and('contain.text', '1st');
      infrastructurePage
        .findClusterQueueWorkloadRow(PROJECT_D, 'multimodal-trial')
        .should('contain.text', 'Inadmissible')
        .and('contain.text', '--');
    });

    it('should show empty state when the cluster queue has no workloads', () => {
      initWorkloadIntercepts({ workloads: [] });
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode(CLUSTER_QUEUE).click();
      infrastructurePage.findClusterQueueWorkloadsEmptyState().should('exist');
      infrastructurePage.findClusterQueueWorkloadsTable().should('not.exist');
    });

    it('should filter workloads by name and status', () => {
      initWorkloadIntercepts();
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode(CLUSTER_QUEUE).click();
      infrastructurePage.findClusterQueueWorkloadsNameFilter().type('llm-pretrain');
      infrastructurePage.findClusterQueueWorkloadRow(PROJECT_D, 'llm-pretrain-run').should('exist');
      infrastructurePage
        .findClusterQueueWorkloadRow(PROJECT_D, 'multimodal-trial')
        .should('not.exist');
      infrastructurePage.findClusterQueueWorkloadsNameFilter().clear();
      infrastructurePage.findClusterQueueWorkloadsStatusFilter().click();
      cy.findByRole('option', { name: 'Queued' }).click();
      infrastructurePage.findClusterQueueWorkloadRow(PROJECT_D, 'llm-pretrain-run').should('exist');
      infrastructurePage
        .findClusterQueueWorkloadRow(PROJECT_D, 'multimodal-trial')
        .should('not.exist');
    });

    it('should show an error when namespace workload data fails to load', () => {
      initWorkloadIntercepts({ workloadListError: true });
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode(CLUSTER_QUEUE).click();
      infrastructurePage.findClusterQueueWorkloadsError().should('exist');
    });
  });
});
