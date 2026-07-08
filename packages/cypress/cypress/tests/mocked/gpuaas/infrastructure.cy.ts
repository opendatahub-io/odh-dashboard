import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
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

type InitInterceptsOptions = {
  isKueueInstalled?: boolean;
  gpuaas?: boolean;
  hasAccelerators?: boolean;
  hasDcgm?: boolean;
};

const initIntercepts = ({
  isKueueInstalled = true,
  gpuaas = true,
  hasAccelerators = true,
  hasDcgm = true,
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

  it('should not exist when feature flag is disabled', () => {
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
});
