import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { globalDistributedWorkloads } from '#~/__tests__/cypress/cypress/pages/distributedWorkloads';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockDWUsageByOwnerPrometheusResponse } from '#~/__mocks__/mockDWUsageByOwnerPrometheusResponse';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import type { ClusterQueueKind, LocalQueueKind, WorkloadKind, WorkloadPodSet } from '#~/k8sTypes';
import { WorkloadOwnerType } from '#~/k8sTypes';
import type { PodContainer } from '#~/types';
import { WorkloadStatusType } from '#~/concepts/distributedWorkloads/utils';
import { mockClusterQueueK8sResource } from '#~/__mocks__/mockClusterQueueK8sResource';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import {
  ClusterQueueModel,
  LocalQueueModel,
  ProjectModel,
  WorkloadModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { RefreshIntervalTitle } from '#~/concepts/metrics/types';

const mockContainer: PodContainer = {
  env: [],
  image: 'perl:5.34.0',
  imagePullPolicy: 'IfNotPresent',
  name: 'pi',
  resources: {
    requests: {
      cpu: '2',
      memory: '200Mi',
    },
  },
  terminationMessagePath: '/dev/termination-log',
  terminationMessagePolicy: 'File',
};
const mockPodset: WorkloadPodSet = {
  count: 5,
  minCount: 4,
  name: 'main',
  template: {
    metadata: {},
    spec: {
      containers: [mockContainer, mockContainer],
      dnsPolicy: 'ClusterFirst',
      restartPolicy: 'Never',
      schedulerName: 'default-scheduler',
      securityContext: {},
      terminationGracePeriodSeconds: 30,
    },
  },
};

type HandlersProps = {
  isKueueInstalled?: boolean;
  disableDistributedWorkloads?: boolean;
  hasProjects?: boolean;
  clusterQueues?: ClusterQueueKind[];
  localQueues?: LocalQueueKind[];
  workloads?: WorkloadKind[];
};

const initIntercepts = ({
  isKueueInstalled = true,
  disableDistributedWorkloads = false,
  hasProjects = true,
  clusterQueues = [mockClusterQueueK8sResource({ name: 'test-cluster-queue' })],
  localQueues = [
    mockLocalQueueK8sResource({ name: 'test-local-queue', namespace: 'test-project' }),
  ],
  workloads = [
    mockWorkloadK8sResource({
      k8sName: 'test-workload-finished',
      ownerKind: WorkloadOwnerType.Job,
      ownerName: 'test-workload-finished-job',
      mockStatus: WorkloadStatusType.Succeeded,
      podSets: [mockPodset, mockPodset],
    }),
    mockWorkloadK8sResource({
      k8sName: 'test-workload-running',
      ownerKind: WorkloadOwnerType.Job,
      ownerName: 'test-workload-running-job',
      mockStatus: WorkloadStatusType.Running,
      podSets: [mockPodset, mockPodset],
    }),
    mockWorkloadK8sResource({
      k8sName: 'test-workload-spinning-down-both',
      ownerKind: WorkloadOwnerType.RayCluster,
      ownerName: 'test-workload-spinning-down-both-rc',
      mockStatus: WorkloadStatusType.Succeeded,
      podSets: [mockPodset, mockPodset],
    }),
    mockWorkloadK8sResource({
      k8sName: 'test-workload-spinning-down-cpu-only',
      ownerKind: WorkloadOwnerType.RayCluster,
      ownerName: 'test-workload-spinning-down-cpu-only-rc',
      mockStatus: WorkloadStatusType.Succeeded,
      podSets: [mockPodset, mockPodset],
    }),
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { kueue: isKueueInstalled },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableDistributedWorkloads,
    }),
  );
  cy.interceptOdh('GET /api/components', null, mockComponents());
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList(
      hasProjects
        ? [
            mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
            mockProjectK8sResource({ k8sName: 'test-project-2', displayName: 'Test Project 2' }),
          ]
        : [],
    ),
  );
  cy.interceptK8sList(ClusterQueueModel, mockK8sResourceList(clusterQueues));
  cy.interceptK8sList(
    {
      model: LocalQueueModel,
      ns: '*',
    },
    mockK8sResourceList(localQueues),
  );
  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: '*',
    },
    mockK8sResourceList(workloads),
  );
  cy.interceptOdh('POST /api/prometheus/query', (req) => {
    if (req.body.query.includes('container_cpu_usage_seconds_total')) {
      req.reply({
        code: 200,
        response: mockDWUsageByOwnerPrometheusResponse({
          [WorkloadOwnerType.Job]: {
            'test-workload-finished-job': 0,
            'test-workload-running-job': 2.2,
          },
          [WorkloadOwnerType.RayCluster]: {
            'test-workload-spinning-down-both-rc': 0.2,
            'test-workload-spinning-down-cpu-only-rc': 0.2,
          },
        }),
      });
    } else if (req.body.query.includes('container_memory_working_set_bytes')) {
      req.reply({
        code: 200,
        response: mockDWUsageByOwnerPrometheusResponse({
          [WorkloadOwnerType.Job]: {
            'test-workload-finished-job': 0,
            'test-workload-running-job': 1610612736, // 1.5 GiB
          },
          [WorkloadOwnerType.RayCluster]: {
            'test-workload-spinning-down-both-rc': 104857600, // 100 MiB
            'test-workload-spinning-down-cpu-only-rc': 0,
          },
        }),
      });
    } else {
      req.reply(404);
    }
  });
};

describe('Distributed Workload Metrics root page', () => {
  it('Does not exist if kueue is not installed', () => {
    initIntercepts({
      isKueueInstalled: false,
      disableDistributedWorkloads: false,
    });
    globalDistributedWorkloads.visit(false);
    globalDistributedWorkloads.findNavItem().should('not.exist');
    globalDistributedWorkloads.shouldNotFoundPage();
  });

  it('Does not exist if feature is disabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: true,
    });
    globalDistributedWorkloads.visit(false);
    globalDistributedWorkloads.findNavItem().should('not.exist');
    globalDistributedWorkloads.shouldNotFoundPage();
  });

  it('Exists if kueue is installed and feature is enabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: false,
    });
    globalDistributedWorkloads.visit();
    globalDistributedWorkloads.findNavItem().should('exist');
    globalDistributedWorkloads.shouldHavePageTitle();
  });

  it('Defaults to Distributed workload status tab and automatically selects a project', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.url().should('include', '/workload-status/test-project');
    globalDistributedWorkloads.findStatusOverviewCard().should('exist');
  });

  it('Tabs navigate to corresponding routes and render their contents', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Project metrics tab').click();
    cy.url().should('include', '/project-metrics/test-project');
    cy.findByText('Top 5 resource-consuming workload metrics').should('exist');

    cy.findByLabelText('Distributed workload status tab').click();
    cy.url().should('include', '/workload-status/test-project');
    globalDistributedWorkloads.findStatusOverviewCard().should('exist');
  });

  it('Changing the project and navigating between tabs or to the root of the page retains the new project', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();
    cy.url().should('include', '/workload-status/test-project');

    globalDistributedWorkloads.projectDropdown.openAndSelectItem('Test Project 2', true);
    cy.url().should('include', '/workload-status/test-project-2');

    cy.findByLabelText('Project metrics tab').click();
    cy.url().should('include', '/project-metrics/test-project-2');

    cy.findByLabelText('Distributed workload status tab').click();
    cy.url().should('include', '/workload-status/test-project-2');

    globalDistributedWorkloads.navigate();
    cy.url().should('include', '/workload-status/test-project-2');
  });

  it('Changing the refresh interval and reloading the page should retain the selection', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    globalDistributedWorkloads.shouldHaveRefreshInterval(RefreshIntervalTitle.THIRTY_MINUTES);

    globalDistributedWorkloads.selectRefreshInterval(RefreshIntervalTitle.FIFTEEN_SECONDS);
    globalDistributedWorkloads.shouldHaveRefreshInterval(RefreshIntervalTitle.FIFTEEN_SECONDS);

    cy.reload();
    globalDistributedWorkloads.shouldHaveRefreshInterval(RefreshIntervalTitle.FIFTEEN_SECONDS);
  });

  it('Should show an empty state if there are no projects', () => {
    initIntercepts({ hasProjects: false });
    globalDistributedWorkloads.visit();

    cy.findByText('No projects').should('exist');
  });

  it('Should render with no quota state when there is no clusterqueue', () => {
    initIntercepts({ clusterQueues: [] });
    globalDistributedWorkloads.visit();
    cy.findByText('Configure the cluster queue').should('exist');
  });

  it('Should render with no quota state when the clusterqueue has no resourceGroups', () => {
    initIntercepts({
      clusterQueues: [
        mockClusterQueueK8sResource({ name: 'test-cluster-queue', hasResourceGroups: false }),
      ],
    });
    globalDistributedWorkloads.visit();
    cy.findByText('Configure the cluster queue').should('exist');
  });

  it('Should render with no quota state when there are no localqueues', () => {
    initIntercepts({ localQueues: [] });
    globalDistributedWorkloads.visit();
    cy.findByText('Configure the project queue').should('exist');
  });
});

describe('Project Metrics tab', () => {
  it('Should render with no workloads empty state', () => {
    initIntercepts({ workloads: [] });
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Project metrics tab').click();

    cy.findByText('Requested resources').should('exist');

    cy.findByTestId('dw-top-consuming-workloads').within(() => {
      cy.findByText('No workload metrics').should('exist');
    });
    cy.findByTestId('dw-workload-resource-metrics').within(() => {
      cy.findByText('No workload metrics').should('exist');
    });
    cy.findByTestId('dw-requested-resources').within(() => {
      // Requested resources shows chart even if empty workload
      cy.findByTestId('requested-resources-cpu-chart-container').should('exist');
    });
  });

  describe('Workload resource metrics table', () => {
    it('Should render', () => {
      initIntercepts({});
      globalDistributedWorkloads.visit();
      cy.findByLabelText('Project metrics tab').click();
      globalDistributedWorkloads.findWorkloadResourceMetricsTable().within(() => {
        cy.findByText('test-workload-finished').should('exist');
      });
    });

    it('Should not render usage bars on a fully finished workload', () => {
      initIntercepts({});
      globalDistributedWorkloads.visit();
      cy.findByLabelText('Project metrics tab').click();
      globalDistributedWorkloads
        .findWorkloadResourceMetricsTable()
        .findByText('test-workload-finished')
        .closest('tr')
        .within(() => {
          cy.get('td[data-label="CPU usage (cores)"]').should('contain.text', '-');
          cy.get('td[data-label="Memory usage (GiB)"]').should('contain.text', '-');
        });
    });

    it('Should render usage bars on a running workload', () => {
      initIntercepts({});
      globalDistributedWorkloads.visit();
      cy.findByLabelText('Project metrics tab').click();
      globalDistributedWorkloads
        .findWorkloadResourceMetricsTable()
        .findByText('test-workload-running')
        .closest('tr')
        .within(() => {
          cy.get('td[data-label="CPU usage (cores)"]').should('not.contain.text', '-');
          cy.get('td[data-label="Memory usage (GiB)"]').should('not.contain.text', '-');
        });
    });

    it('Should render usage bars on a succeeded workload that is still spinning down', () => {
      initIntercepts({});
      globalDistributedWorkloads.visit();
      cy.findByLabelText('Project metrics tab').click();
      globalDistributedWorkloads
        .findWorkloadResourceMetricsTable()
        .findByText('test-workload-spinning-down-both')
        .closest('tr')
        .within(() => {
          cy.get('td[data-label="CPU usage (cores)"]').should('not.contain.text', '-');
          cy.get('td[data-label="Memory usage (GiB)"]').should('not.contain.text', '-');
        });
    });

    it('Spinning-down workload should render usage bars only on the column that is still consuming resources', () => {
      initIntercepts({});
      globalDistributedWorkloads.visit();
      cy.findByLabelText('Project metrics tab').click();
      globalDistributedWorkloads
        .findWorkloadResourceMetricsTable()
        .findByText('test-workload-spinning-down-cpu-only')
        .closest('tr')
        .within(() => {
          cy.get('td[data-label="CPU usage (cores)"]').should('not.contain.text', '-');
          cy.get('td[data-label="Memory usage (GiB)"]').should('contain.text', '-');
        });
    });
  });

  it('Should render the requested resources charts', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Project metrics tab').click();
    cy.findByTestId('requested-resources-cpu-chart-container').should('exist');
  });
});

describe('Workload Status tab', () => {
  it('Should render the status overview chart', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();
    cy.findByLabelText('Distributed workload status tab').click();

    const statusOverview = globalDistributedWorkloads.findStatusOverviewCard();
    statusOverview.should('exist');
    statusOverview.findByText('Succeeded: 3').should('exist');
  });

  it('Should render the status overview chart with pending fallback statuses', () => {
    initIntercepts({
      workloads: [
        mockWorkloadK8sResource({ k8sName: 'test-workload', mockStatus: null }),
        mockWorkloadK8sResource({ k8sName: 'test-workload-2', mockStatus: null }),
      ],
    });
    globalDistributedWorkloads.visit();
    cy.findByLabelText('Distributed workload status tab').click();

    const statusOverview = globalDistributedWorkloads.findStatusOverviewCard();
    statusOverview.should('exist');
    statusOverview.findByText('Pending: 2').should('exist');
  });

  it('Should render the workloads table', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Distributed workload status tab').click();
    cy.findByText('test-workload-finished').should('exist');
  });

  it('Should render an empty state for the dw table if no workloads', () => {
    initIntercepts({ workloads: [] });
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Distributed workload status tab').click();
    cy.findByTestId('dw-workloads-table-card').within(() => {
      cy.findByText('No workload metrics').should('exist');
    });
  });

  it('redirect from v2 to v3 route', () => {
    initIntercepts({});
    cy.visitWithLogin('/distributedWorkloads');
    globalDistributedWorkloads.shouldHavePageTitle();
    cy.url().should('include', '/observe-monitor/workload-metrics/workload-status/test-project');
  });
});
