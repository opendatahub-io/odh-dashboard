import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockCohortK8sResource } from '@odh-dashboard/internal/__mocks__/mockCohortK8sResource';
import { mockResourceFlavorK8sResource } from '@odh-dashboard/internal/__mocks__/mockResourceFlavorK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import type { WorkloadKind, WorkloadPodSet } from '@odh-dashboard/k8s-core';
import { WorkloadOwnerType } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  ClusterQueueModel,
  LocalQueueModel,
  WorkloadModel,
} from '@odh-dashboard/k8s-core/api/models';
import { CohortModel, PodModel, ProjectModel, ResourceFlavorModel } from '../../../utils/models';
import { getK8sAPIResourceURL } from '../../../utils/k8s';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { infrastructurePage } from '../../../pages/infrastructure';

const mockPrometheusResponse = (value: string) => ({
  data: {
    result: [{ value: [Date.now() / 1000, value] }],
    resultType: 'vector',
  },
  status: 'success',
});

const mockEmptyPrometheusResponse = () => ({
  data: { result: [], resultType: 'vector' },
  status: 'success',
});

const mockHardwareModelResponse = (models: { modelName: string; count: string }[]) => ({
  data: {
    result: models.map(({ modelName, count }) => ({
      metric: { modelName },
      value: [Date.now() / 1000, count],
    })),
    resultType: 'vector',
  },
  status: 'success',
});

const NODE_LABEL_KEY = 'label_nvidia_com_gpu_product';
const mockNodeLabelResponse = (models: { label: string; count: string }[]) => ({
  data: {
    result: models.map(({ label, count }) => ({
      metric: { [NODE_LABEL_KEY]: label },
      value: [Date.now() / 1000, count],
    })),
    resultType: 'vector',
  },
  status: 'success',
});

const mockPrometheusResponseWithModel = (modelName: string, value: string) => ({
  data: {
    result: [{ metric: { modelName }, value: [Date.now() / 1000, value] }],
    resultType: 'vector',
  },
  status: 'success',
});

const NOW_S = Math.floor(Date.now() / 1000);
const ONE_HOUR_S = 3600;

const makeRangeResult = (cqName: string, netValues: number[]) => ({
  // eslint-disable-next-line camelcase
  metric: { cluster_queue: cqName },
  values: netValues.map((v, i): [number, string] => [
    NOW_S - (netValues.length - i) * ONE_HOUR_S,
    String(v),
  ]),
});

const makePrometheusRangeResponse = (results: ReturnType<typeof makeRangeResult>[]) => ({
  code: 200,
  response: {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: results,
    },
  },
});

type InitInterceptsOptions = {
  isKueueInstalled?: boolean;
  gpuaas?: boolean;
  hasAccelerators?: boolean;
  hasDcgm?: boolean;
  hasHardwareModels?: boolean;
  hasNodeLabels?: boolean;
  /** When set, per-model DCGM queries return data keyed by this model name. */
  dcgmModelName?: string;
  clusterQueues?: Parameters<typeof mockClusterQueueK8sResource>[0][];
  cohortNames?: (string | { name: string; parentName?: string })[];
  resourceFlavors?: Parameters<typeof mockResourceFlavorK8sResource>[0][];
  hasChartData?: boolean;
};

const MOCK_HARDWARE_MODELS = [
  { modelName: 'NVIDIA H100', count: '8' },
  { modelName: 'NVIDIA A100', count: '12' },
  { modelName: 'NVIDIA L40S', count: '6' },
  { modelName: 'AMD MI300X', count: '4' },
];

const MOCK_HARDWARE_IN_USE = [
  { modelName: 'NVIDIA H100', count: '8' },
  { modelName: 'NVIDIA A100', count: '12' },
  { modelName: 'NVIDIA L40S', count: '4' },
  { modelName: 'AMD MI300X', count: '2' },
];

const MOCK_NODE_LABELS = [
  { label: 'NVIDIA L40S', count: '4' },
  { label: 'AMD MI300X', count: '2' },
];

const initIntercepts = ({
  isKueueInstalled = true,
  gpuaas = true,
  hasAccelerators = true,
  hasDcgm = true,
  hasHardwareModels = true,
  hasNodeLabels = false,
  dcgmModelName,
  clusterQueues = [{ name: 'test-cq' }],
  cohortNames = ['test-cohort'],
  resourceFlavors = [],
  hasChartData = false,
}: InitInterceptsOptions = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.KUEUE]: {
          managementState: isKueueInstalled ? 'Managed' : 'Removed',
        },
      },
    }),
  );
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ gpuaas }));
  cy.interceptOdh('GET /api/components', null, mockComponents());

  cy.interceptK8sList(
    ClusterQueueModel,
    mockK8sResourceList(clusterQueues.map((opts) => mockClusterQueueK8sResource(opts))),
  );
  cy.interceptK8sList(
    CohortModel,
    mockK8sResourceList(
      cohortNames.map((entry) =>
        typeof entry === 'string'
          ? mockCohortK8sResource({ name: entry })
          : mockCohortK8sResource(entry),
      ),
    ),
  );
  cy.interceptK8sList(
    ResourceFlavorModel,
    mockK8sResourceList(resourceFlavors.map((opts) => mockResourceFlavorK8sResource(opts))),
  );

  cy.interceptOdh('POST /api/prometheus/cluster/query', (req) => {
    const { query } = req.body;

    // DCGM per-model queries must come before the generic 'modelName' check because
    // they contain both 'DCGM_FI_*' and 'modelName' in the same query string.
    if (query.includes('modelName') && query.includes('pod')) {
      // Hardware usage per-model (pod-level resource requests).
      req.reply({
        code: 200,
        response:
          hasDcgm && hasHardwareModels
            ? mockHardwareModelResponse(MOCK_HARDWARE_IN_USE)
            : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('DCGM_FI_PROF_GR_ENGINE_ACTIVE')) {
      // Per-model query: return model-keyed data; aggregate query: return single value.
      req.reply({
        code: 200,
        response: hasDcgm
          ? query.includes('modelName')
            ? dcgmModelName
              ? mockPrometheusResponseWithModel(dcgmModelName, '30')
              : mockHardwareModelResponse(MOCK_HARDWARE_MODELS)
            : mockPrometheusResponse('79.5')
          : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('DCGM_FI_DEV_FB_USED')) {
      req.reply({
        code: 200,
        response: hasDcgm
          ? query.includes('modelName')
            ? dcgmModelName
              ? mockPrometheusResponseWithModel(dcgmModelName, '35')
              : mockHardwareModelResponse(MOCK_HARDWARE_IN_USE)
            : mockPrometheusResponse('83.2')
          : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('modelName')) {
      // Generic hardware model count query (no DCGM, no pod filter).
      req.reply({
        code: 200,
        response:
          hasDcgm && hasHardwareModels
            ? mockHardwareModelResponse(MOCK_HARDWARE_MODELS)
            : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('kube_node_status_allocatable')) {
      req.reply({
        code: 200,
        response: hasAccelerators ? mockPrometheusResponse('16') : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('kube_pod_container_resource_requests')) {
      req.reply({
        code: 200,
        response: hasAccelerators ? mockPrometheusResponse('11') : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('kube_node_labels')) {
      req.reply({
        code: 200,
        response: hasNodeLabels
          ? mockNodeLabelResponse(MOCK_NODE_LABELS)
          : mockEmptyPrometheusResponse(),
      });
    } else {
      req.reply(404);
    }
  });

  cy.interceptOdh('POST /api/prometheus/cluster/queryRange', (req) => {
    if (req.body.query && req.body.query.includes('kueue_cluster_queue_resource_usage')) {
      req.reply(
        makePrometheusRangeResponse(
          hasChartData
            ? clusterQueues.map((opts) => makeRangeResult(opts.name ?? '', [2, -1, 3, 0, 2, -2, 1]))
            : [],
        ),
      );
    } else {
      req.reply(404);
    }
  });
};

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

  describe('Quota usage section', () => {
    const nestedCohortQuotaUsageIntercepts: Pick<
      InitInterceptsOptions,
      'clusterQueues' | 'cohortNames' | 'resourceFlavors'
    > = {
      clusterQueues: [
        {
          name: 'prod-serving',
          cohortName: 'inference-edge',
          gpuFlavorName: 'a100-flavor',
          gpuNominalQuota: 4,
        },
        {
          name: 'legacy-batch',
          gpuFlavorName: 'a100-flavor',
          gpuNominalQuota: 2,
        },
      ],
      cohortNames: ['production', { name: 'inference-edge', parentName: 'production' }],
      resourceFlavors: [{ name: 'a100-flavor', gpuProduct: 'NVIDIA A100' }],
    };

    beforeEach(() => {
      asClusterAdminUser();
    });

    it('should show empty state when no cluster queues exist', () => {
      initIntercepts({ clusterQueues: [], cohortNames: [], resourceFlavors: [] });
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage
        .findQuotaUsageEmptyState()
        .should('exist')
        .should('contain.text', 'No accelerator cluster queues found');
    });

    it('should show empty state when all cluster queues are CPU-only', () => {
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
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageEmptyState().should('exist');
    });

    it('should render tree with default cohort selection when no unassigned cluster queues exist', () => {
      initIntercepts({
        clusterQueues: [
          {
            name: 'cq-gpu',
            cohortName: 'cohort-1',
            gpuFlavorName: 'a100-flavor',
            gpuNominalQuota: 8,
            gpuUsed: 5,
            admittedWorkloads: 2,
            pendingWorkloads: 1,
          },
        ],
        cohortNames: ['cohort-1'],
        resourceFlavors: [{ name: 'a100-flavor', gpuProduct: 'NVIDIA A100' }],
      });
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage
        .findQuotaUsageDescription()
        .should('contain.text', 'View quota usage across cluster queues');
      infrastructurePage.findQuotaUsageTreeNode('cohort-1').should('exist');
      infrastructurePage.findQuotaUsageTreeNode('cq-gpu').should('exist');
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'cohort-1');
      infrastructurePage.findQuotaUsageCollapseAll().should('exist');
    });

    it('should render nested cohort tree and navigate breadcrumb segments', () => {
      initIntercepts(nestedCohortQuotaUsageIntercepts);
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageCollapseAll().should('exist');
      infrastructurePage.findQuotaUsageTreeNode('production').should('exist');
      infrastructurePage.findQuotaUsageTreeNode('inference-edge').should('exist');
      infrastructurePage.findQuotaUsageTreeNode('prod-serving').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'prod-serving');
      infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'production');
      infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', 'inference-edge');
      infrastructurePage.findQuotaUsageBreadcrumbSegment('production').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'production');
      infrastructurePage.findQuotaUsageTreeNode('inference-edge').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'inference-edge');
      infrastructurePage.findQuotaUsageBreadcrumbSegment('production').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'production');
    });

    it('should select cohort nodes and filter tree results by search', () => {
      initIntercepts(nestedCohortQuotaUsageIntercepts);
      infrastructurePage.visit();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageTreeNode('Unassigned').should('exist');
      infrastructurePage.findQuotaUsageTreeNode('legacy-batch').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'legacy-batch');
      infrastructurePage.findQuotaUsageTreeNode('production').click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', 'production');
      infrastructurePage.findQuotaUsageNavSearch().type('prod-serving');
      infrastructurePage.findQuotaUsageTreeNode('prod-serving').should('exist');
      infrastructurePage.findQuotaUsageTreeNode('legacy-batch').should('not.exist');
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
