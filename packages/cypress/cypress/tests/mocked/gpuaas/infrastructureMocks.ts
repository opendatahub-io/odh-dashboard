import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockCohortK8sResource } from '@odh-dashboard/internal/__mocks__/mockCohortK8sResource';
import { mockResourceFlavorK8sResource } from '@odh-dashboard/internal/__mocks__/mockResourceFlavorK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ClusterQueueModel } from '@odh-dashboard/k8s-core/api/models';
import { CohortModel, ResourceFlavorModel } from '../../../utils/models';

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

const makeRangeResult = (cqName: string, usageValues: number[]) => ({
  // eslint-disable-next-line camelcase
  metric: { cluster_queue: cqName },
  values: usageValues.map((usage, index): [number, string] => [
    NOW_S - (usageValues.length - index) * ONE_HOUR_S,
    String(usage),
  ]),
});

const buildUsageRangeValues = (
  opts: NonNullable<InitInterceptsOptions['clusterQueues']>[number],
): number[] => {
  const nominal = opts.gpuNominalQuota ?? 0;
  const used = opts.gpuUsed ?? nominal;
  const isBorrowing = (opts.gpuBorrowed ?? 0) > 0;

  if (isBorrowing && nominal > 0) {
    return [nominal - 1, nominal - 1, nominal - 1, used, used, used, used];
  }

  return [used, used, used, used, used, used, used];
};

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

export type InitInterceptsOptions = {
  isKueueInstalled?: boolean;
  gpuaas?: boolean;
  hasAccelerators?: boolean;
  hasDcgm?: boolean;
  dcgmRequestError?: boolean;
  hasHardwareModels?: boolean;
  hasNodeLabels?: boolean;
  /** When set, per-model DCGM queries return data keyed by this model name. */
  dcgmModelName?: string;
  /** Per-model DCGM compute % when dcgmModelName is set. Defaults to 30. */
  dcgmComputePercent?: number;
  /** Per-model DCGM memory % when dcgmModelName is set. Defaults to 35. */
  dcgmMemoryPercent?: number;
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

export const nestedCohortQuotaUsageIntercepts: Pick<
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

/** Prototype-like nested cohort with lender + borrowing cluster queue (RHOAIENG-88178). */
export const borrowingCohortQuotaUsageIntercepts: Pick<
  InitInterceptsOptions,
  'clusterQueues' | 'cohortNames' | 'resourceFlavors'
> = {
  clusterQueues: [
    {
      name: 'prod-serving',
      cohortName: 'platform-production',
      gpuFlavorName: 'h100-flavor',
      gpuNominalQuota: 20,
      gpuUsed: 16,
      gpuBorrowed: 0,
      gpuBorrowingLimit: 4,
      admittedWorkloads: 2,
      pendingWorkloads: 0,
    },
    {
      name: 'high-priority-compute',
      cohortName: 'platform-production',
      gpuFlavorName: 'h100-flavor',
      gpuNominalQuota: 12,
      gpuUsed: 14,
      gpuBorrowed: 2,
      gpuBorrowingLimit: 2,
      admittedWorkloads: 1,
      pendingWorkloads: 1,
    },
  ],
  cohortNames: ['production', { name: 'platform-production', parentName: 'production' }],
  resourceFlavors: [{ name: 'h100-flavor', gpuProduct: 'NVIDIA H100' }],
};

/** Single A100 cluster queue in cohort-1 — reused for DCGM-unavailable and Kueue projects tests. */
export const singleA100ClusterQueueIntercepts: Pick<
  InitInterceptsOptions,
  'clusterQueues' | 'cohortNames' | 'resourceFlavors'
> = {
  clusterQueues: [
    {
      name: 'cq-gpu',
      cohortName: 'cohort-1',
      gpuFlavorName: 'a100-flavor',
      gpuNominalQuota: 8,
      gpuUsed: 5,
    },
  ],
  cohortNames: ['cohort-1'],
  resourceFlavors: [{ name: 'a100-flavor', gpuProduct: 'NVIDIA A100' }],
};

export const initIntercepts = ({
  isKueueInstalled = true,
  gpuaas = true,
  hasAccelerators = true,
  hasDcgm = true,
  dcgmRequestError = false,
  hasHardwareModels = true,
  hasNodeLabels = false,
  dcgmModelName,
  dcgmComputePercent = 30,
  dcgmMemoryPercent = 35,
  clusterQueues = [{ name: 'test-cq' }],
  cohortNames = ['test-cohort'],
  resourceFlavors = [],
  hasChartData = false,
}: InitInterceptsOptions = {}): void => {
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
      if (dcgmRequestError) {
        req.reply({ statusCode: 500, body: { message: 'DCGM metrics unavailable' } });
        return;
      }
      // Per-model query: return model-keyed data; aggregate query: return single value.
      req.reply({
        code: 200,
        response: hasDcgm
          ? query.includes('modelName')
            ? dcgmModelName
              ? mockPrometheusResponseWithModel(dcgmModelName, String(dcgmComputePercent))
              : mockHardwareModelResponse(MOCK_HARDWARE_MODELS)
            : mockPrometheusResponse('79.5')
          : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('DCGM_FI_DEV_FB_USED')) {
      if (dcgmRequestError) {
        req.reply({ statusCode: 500, body: { message: 'DCGM metrics unavailable' } });
        return;
      }
      req.reply({
        code: 200,
        response: hasDcgm
          ? query.includes('modelName')
            ? dcgmModelName
              ? mockPrometheusResponseWithModel(dcgmModelName, String(dcgmMemoryPercent))
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
            ? clusterQueues.map((opts) =>
                makeRangeResult(opts.name ?? '', buildUsageRangeValues(opts)),
              )
            : [],
        ),
      );
    } else {
      req.reply(404);
    }
  });
};
