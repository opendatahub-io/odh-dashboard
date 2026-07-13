import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockCohortK8sResource } from '@odh-dashboard/internal/__mocks__/mockCohortK8sResource';
import type { ClusterQueueKind, CohortKind } from '@odh-dashboard/internal/k8sTypes';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { ClusterQueueModel, CohortModel } from '../../../utils/models';
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
  clusterQueues?: ClusterQueueKind[];
  cohorts?: CohortKind[];
  hasChartData?: boolean;
};

const initIntercepts = ({
  isKueueInstalled = true,
  gpuaas = true,
  hasAccelerators = true,
  hasDcgm = true,
  clusterQueues = [mockClusterQueueK8sResource({ name: 'test-cq' })],
  cohorts = [mockCohortK8sResource({ name: 'test-cohort' })],
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
  cy.interceptK8sList(ClusterQueueModel, mockK8sResourceList(clusterQueues));
  cy.interceptK8sList(CohortModel, mockK8sResourceList(cohorts));

  cy.interceptOdh('POST /api/prometheus/query', (req) => {
    const query = req.body.query as string;

    if (query.includes('kube_node_status_allocatable')) {
      req.reply({
        code: 200,
        response: hasAccelerators ? mockPrometheusResponse('16') : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('kube_pod_container_resource_requests')) {
      req.reply({
        code: 200,
        response: hasAccelerators ? mockPrometheusResponse('11') : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('DCGM_FI_PROF_GR_ENGINE_ACTIVE')) {
      req.reply({
        code: 200,
        response: hasDcgm ? mockPrometheusResponse('79.5') : mockEmptyPrometheusResponse(),
      });
    } else if (query.includes('DCGM_FI_DEV_FB_USED')) {
      req.reply({
        code: 200,
        response: hasDcgm ? mockPrometheusResponse('83.2') : mockEmptyPrometheusResponse(),
      });
    } else {
      req.reply(404);
    }
  });

  cy.interceptOdh('POST /api/prometheus/queryRange', (req) => {
    if (req.body.query && req.body.query.includes('kueue_cluster_queue_resource_usage')) {
      req.reply(
        makePrometheusRangeResponse(
          hasChartData
            ? clusterQueues.map((cq) =>
                makeRangeResult(cq.metadata?.name ?? '', [2, -1, 3, 0, 2, -2, 1]),
              )
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

  it('should not exist when Kueue is not installed', () => {
    asClusterAdminUser();
    initIntercepts({ isKueueInstalled: false });
    infrastructurePage.visit(false);
    infrastructurePage.findNavItem().should('not.exist');
    infrastructurePage.shouldNotFoundPage();
  });

  it('should not exist when the gpuaas feature flag is disabled', () => {
    asClusterAdminUser();
    initIntercepts({ gpuaas: false });
    infrastructurePage.visit(false);
    infrastructurePage.findNavItem().should('not.exist');
    infrastructurePage.shouldNotFoundPage();
  });

  describe('with GPU data available', () => {
    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: true, hasDcgm: true });
    });

    it('should display cluster section with correct card data and refresh badge', () => {
      infrastructurePage.visit();
      infrastructurePage.findClusterSection().should('exist');
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', '11/16');
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', 'Accelerators in use');
      infrastructurePage.findComputeUtilizationCard().should('contain.text', '80%');
      infrastructurePage.findMemoryUtilizationCard().should('contain.text', '83%');
      infrastructurePage.findRefreshBadge().should('exist');
      infrastructurePage.findRefreshBadge().should('contain.text', 'Refreshed');
    });
  });

  describe('with no accelerators', () => {
    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: false, hasDcgm: false });
    });

    it('should display empty states for all cards', () => {
      infrastructurePage.visit();
      infrastructurePage
        .findTotalAcceleratorsCard()
        .should('contain.text', 'No accelerator resources detected');
      infrastructurePage
        .findComputeUtilizationCard()
        .should('contain.text', 'Utilization metrics unavailable');
      infrastructurePage
        .findMemoryUtilizationCard()
        .should('contain.text', 'Utilization metrics unavailable');
    });
  });

  describe('with accelerators but no DCGM', () => {
    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ hasAccelerators: true, hasDcgm: false });
    });

    it('should show accelerator data but empty utilization cards', () => {
      infrastructurePage.visit();
      infrastructurePage.findTotalAcceleratorsCard().should('contain.text', '11/16');
      infrastructurePage
        .findComputeUtilizationCard()
        .should('contain.text', 'Utilization metrics unavailable');
      infrastructurePage
        .findMemoryUtilizationCard()
        .should('contain.text', 'Utilization metrics unavailable');
    });
  });

  describe('Borrowing & lending chart', () => {
    const cohort1 = mockCohortK8sResource({ name: 'cohort-inference' });
    const cq1 = mockClusterQueueK8sResource({
      name: 'cq-inference',
      cohortName: 'cohort-inference',
    });
    const cq2 = mockClusterQueueK8sResource({
      name: 'cq-training',
      cohortName: 'cohort-inference',
    });

    it('renders the chart, cohort filter, and CQ filter when data is present', () => {
      asClusterAdminUser();
      initIntercepts({ hasChartData: true, clusterQueues: [cq1, cq2], cohorts: [cohort1] });
      infrastructurePage.visit();

      infrastructurePage.findBorrowingLendingChart().should('exist');

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
      initIntercepts({ hasChartData: false, clusterQueues: [cq1], cohorts: [cohort1] });
      infrastructurePage.visit();
      infrastructurePage.findBorrowingLendingEmptyState().should('exist');
    });
  });
});
