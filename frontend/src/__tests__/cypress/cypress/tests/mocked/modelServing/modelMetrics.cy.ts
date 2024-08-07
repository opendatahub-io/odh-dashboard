import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import {
  configureBiasMetricModal,
  modelMetricsBias,
  modelMetricsConfigureSection,
  modelMetricsKserve,
  modelMetricsPerformance,
  serverMetrics,
} from '~/__tests__/cypress/cypress/pages/modelMetrics';
import type { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { mockPrometheusServing } from '~/__mocks__/mockPrometheusServing';
import { mockPrometheusBias } from '~/__mocks__/mockPrometheusBias';
import { mockMetricsRequest } from '~/__mocks__/mockMetricsRequests';
import { mockTrustyAIServiceK8sResource } from '~/__mocks__/mockTrustyAIServiceK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { projectDetailsSettingsTab } from '~/__tests__/cypress/cypress/pages/projects';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockServingRuntimeTemplateK8sResource,
  mockInvalidTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimePlatform } from '~/types';
import { mock403Error, mock404Error } from '~/__mocks__/mockK8sStatus';
import {
  ConfigMapModel,
  InferenceServiceModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
  TrustyAIApplicationsModel,
} from '~/__tests__/cypress/cypress/utils/models';
import {
  MOCK_KSERVE_METRICS_CONFIG_2,
  MOCK_KSERVE_METRICS_CONFIG_3,
  mockKserveMetricsConfigMap,
} from '~/__mocks__/mockKserveMetricsConfigMap';

type HandlersProps = {
  disablePerformanceMetrics?: boolean;
  disableBiasMetrics?: boolean;
  disableKServeMetrics?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  hasServingData: boolean;
  hasBiasData: boolean;
  enableModelMesh?: boolean;
  isTrustyAIAvailable?: boolean;
  isTrustyAIInstalled?: boolean;
};

const initIntercepts = ({
  disablePerformanceMetrics,
  disableBiasMetrics,
  disableKServeMetrics,
  servingRuntimes = [mockServingRuntimeK8sResource({})],
  inferenceServices = [mockInferenceServiceK8sResource({ isModelMesh: true })],
  hasServingData = false,
  hasBiasData = false,
  enableModelMesh = true,
  isTrustyAIAvailable = true,
  isTrustyAIInstalled = true,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true, trustyai: true },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableBiasMetrics,
      disablePerformanceMetrics,
      disableKServeMetrics,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project', enableModelMesh })]),
  );
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList(servingRuntimes, { namespace: 'modelServing' }),
  );
  cy.interceptK8sList(
    InferenceServiceModel,
    mockK8sResourceList(inferenceServices, { namespace: 'modelServing' }),
  );
  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'modelServing' })]),
  );
  cy.interceptK8s(
    ServingRuntimeModel,
    mockServingRuntimeK8sResource({ name: 'test-model', namespace: 'test-project' }),
  );
  cy.interceptOdh(
    'POST /api/prometheus/serving',
    mockPrometheusServing({ result: hasServingData ? undefined : [] }), // will mock for both ok and not ok
  );
  cy.interceptOdh('POST /api/prometheus/bias', (req) => {
    if ((req.body as { query: string }).query.includes(`query=trustyai_dir`)) {
      req.reply(mockPrometheusBias({ result: hasBiasData ? undefined : [], metric: 'DIR' }));
    }
  });
  cy.interceptOdh('POST /api/prometheus/bias', (req) => {
    if ((req.body as { query: string }).query.includes(`query=trustyai_spd`)) {
      req.reply(mockPrometheusBias({ result: hasBiasData ? undefined : [], metric: 'SPD' }));
    }
  });
  cy.interceptOdh(
    'GET /api/service/trustyai/:namespace/trustyai-service/metrics/all/requests',
    { path: { namespace: 'test-project' }, query: { type: 'fairness' } },
    mockMetricsRequest({ modelName: 'test-inference-service' }),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-1',
          displayName: 'Multi Platform',
          platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'New OVMS Server',
          platforms: [ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-4',
          displayName: 'Serving Runtime with No Annotations',
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'opendatahub' },
    ),
  );

  cy.interceptK8s(
    {
      model: TrustyAIApplicationsModel,
      ns: 'test-project',
      name: 'trustyai-service',
    },
    isTrustyAIInstalled
      ? mockTrustyAIServiceK8sResource({
          isAvailable: isTrustyAIAvailable,
        })
      : { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ name: 'trustyai-service' }));
};

describe('Model Metrics', () => {
  it('Empty State No Serving Data Available', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
    });

    modelMetricsPerformance.visit('test-project', 'test-inference-service');
    modelMetricsPerformance.getMetricsChart('HTTP requests per 5 minutes').shouldHaveNoData();
  });

  it('Serving Chart Shows Data', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: true,
      hasBiasData: false,
    });

    modelMetricsPerformance.visit('test-project', 'test-inference-service');
    modelMetricsPerformance.getMetricsChart('HTTP requests per 5 minutes').shouldHaveData();
  });

  it('Empty State No Bias Data Available', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
    });

    modelMetricsBias.visit('test-project', 'test-inference-service');

    modelMetricsBias.findConfigSelector().click();
    modelMetricsBias.selectMetric('Loan Acceptance 4');
    modelMetricsBias.selectMetric('Loan acceptance 2');
    modelMetricsBias.selectMetric('Loan acceptance 2 STRICT');
    modelMetricsBias.findConfigSelector().click();

    modelMetricsBias
      .getMetricsChart('Statistical parity difference (SPD)', 'Loan acceptance')
      .shouldHaveNoData();
    modelMetricsBias
      .getMetricsChart('Statistical parity difference (SPD)', 'Loan Acceptance 4')
      .shouldHaveNoData();
    modelMetricsBias
      .getMetricsChart('Disparate impact ratio (DIR)', 'Loan acceptance 2')
      .shouldHaveNoData();
    modelMetricsBias
      .getMetricsChart('Disparate impact ratio (DIR)', 'Loan acceptance 2 STRICT')
      .shouldHaveNoData();
  });

  it('Bias Charts Show Data', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: true,
    });

    modelMetricsBias.visit('test-project', 'test-inference-service');

    modelMetricsBias.findConfigSelector().click();
    modelMetricsBias.selectMetric('Loan Acceptance 4');
    modelMetricsBias.selectMetric('Loan acceptance 2');
    modelMetricsBias.selectMetric('Loan acceptance 2 STRICT');
    modelMetricsBias.findConfigSelector().click();

    modelMetricsBias
      .getMetricsChart('Statistical parity difference (SPD)', 'Loan acceptance')
      .shouldHaveData();
    modelMetricsBias
      .getMetricsChart('Statistical parity difference (SPD)', 'Loan Acceptance 4')
      .shouldHaveData();
    modelMetricsBias
      .getMetricsChart('Disparate impact ratio (DIR)', 'Loan acceptance 2')
      .shouldHaveData();
    modelMetricsBias
      .getMetricsChart('Disparate impact ratio (DIR)', 'Loan acceptance 2 STRICT')
      .shouldHaveData();
  });

  it('Server metrics show no data available ', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
    });

    serverMetrics.visit('test-project', 'test-model');
    serverMetrics.getMetricsChart('HTTP requests per 5 minutes').shouldHaveNoData();
    serverMetrics.getMetricsChart('Average response time (ms)').shouldHaveNoData();
    serverMetrics.getMetricsChart('CPU utilization %').shouldHaveNoData();
    serverMetrics.getMetricsChart('Memory utilization %').shouldHaveNoData();
  });

  it('Server metrics show data', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: true,
      hasBiasData: false,
    });

    serverMetrics.visit('test-project', 'test-model');
    serverMetrics.getMetricsChart('HTTP requests per 5 minutes').shouldHaveData();
    serverMetrics.getMetricsChart('Average response time (ms)').shouldHaveData();
    serverMetrics.getMetricsChart('CPU utilization %').shouldHaveData();
    serverMetrics.getMetricsChart('Memory utilization %').shouldHaveData();
  });

  it('Bias metrics is not configured', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      inferenceServices: [
        mockInferenceServiceK8sResource({ isModelMesh: false, name: 'empty-model' }),
      ],
    });

    modelMetricsBias.visit('test-project', 'empty-model', true);
    modelMetricsBias.shouldNotBeConfigured();
  });

  it('Performance Metrics Tab Hidden', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: true,
      hasServingData: false,
      hasBiasData: false,
    });

    modelMetricsBias.visit('test-project', 'test-inference-service');
    modelMetricsPerformance.findTab().should('not.exist');
  });

  it('Bias Metrics Tab Hidden', () => {
    initIntercepts({
      disableBiasMetrics: true,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
    });

    modelMetricsPerformance.visit('test-project', 'test-inference-service');
    modelMetricsBias.findTab().should('not.exist');
  });

  it('Disable Trusty AI', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
    });

    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab
      .findTrustyAIInstallCheckbox()
      .should('be.enabled')
      .should('be.checked');

    // test disabling
    cy.interceptK8s(
      'DELETE',
      {
        model: TrustyAIApplicationsModel,
        ns: 'test-project',
        name: 'trustyai-service',
      },
      {},
    ).as('uninstallTrustyAI');

    projectDetailsSettingsTab.findTrustyAIInstallCheckbox().uncheck();
    projectDetailsSettingsTab
      .getTrustyAIUninstallModal()
      .findSubmitButton()
      .should('not.be.enabled');
    projectDetailsSettingsTab.getTrustyAIUninstallModal().findInput().type('trustyai');
    projectDetailsSettingsTab
      .getTrustyAIUninstallModal()
      .findSubmitButton()
      .should('be.enabled')
      .click();

    cy.wait('@uninstallTrustyAI');
  });

  it('Enable Trusty AI', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      isTrustyAIInstalled: false,
    });

    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab
      .findTrustyAIInstallCheckbox()
      .should('be.enabled')
      .should('not.be.checked');

    // test enabling
    cy.interceptK8s(
      'POST',
      TrustyAIApplicationsModel,
      mockTrustyAIServiceK8sResource({ isAvailable: true }),
    ).as('installTrustyAI');

    cy.interceptK8s(
      TrustyAIApplicationsModel,
      mockTrustyAIServiceK8sResource({
        isAvailable: false,
      }),
    ).as('getTrustyAILoading');

    projectDetailsSettingsTab.findTrustyAIInstallCheckbox().check();

    cy.wait('@installTrustyAI').then((interception) => {
      expect(interception.request.body).to.be.eql({
        apiVersion: 'trustyai.opendatahub.io/v1alpha1',
        kind: 'TrustyAIService',
        metadata: {
          name: 'trustyai-service',
          namespace: 'test-project',
        },
        spec: {
          storage: {
            format: 'PVC',
            folder: '/inputs',
            size: '1Gi',
          },
          data: {
            filename: 'data.csv',
            format: 'CSV',
          },
          metrics: {
            schedule: '5s',
          },
        },
      });
    });
  });

  it('Trusty AI enable service error', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      isTrustyAIInstalled: false,
    });

    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab
      .findTrustyAIInstallCheckbox()
      .should('be.enabled')
      .should('not.be.checked');

    cy.interceptK8s(
      'POST',
      TrustyAIApplicationsModel,
      mockTrustyAIServiceK8sResource({ isAvailable: true }),
    ).as('installTrustyAI');

    cy.interceptK8s(
      {
        model: TrustyAIApplicationsModel,
        ns: 'test-project',
        name: 'trustyai-service',
      },
      { statusCode: 403, body: mock403Error({}) },
    ).as('getTrustyAIError');

    projectDetailsSettingsTab.findTrustyAIInstallCheckbox().check();

    cy.wait('@installTrustyAI');

    // test service error
    cy.wait('@getTrustyAIError');

    projectDetailsSettingsTab.findTrustyAIServiceError().should('exist');
  });

  it('Trusty AI enable timeout error', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      isTrustyAIInstalled: false,
    });

    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab
      .findTrustyAIInstallCheckbox()
      .should('be.enabled')
      .should('not.be.checked');

    cy.interceptK8s(
      'POST',
      TrustyAIApplicationsModel,
      mockTrustyAIServiceK8sResource({ isAvailable: true }),
    ).as('installTrustyAI');

    cy.interceptK8s(
      TrustyAIApplicationsModel,
      mockTrustyAIServiceK8sResource({
        isAvailable: false,
        creationTimestamp: new Date('2022-05-15T00:00:00.000Z').toISOString(),
      }),
    ).as('getTrustyAITimeout');

    projectDetailsSettingsTab.findTrustyAIInstallCheckbox().check();

    cy.wait('@installTrustyAI');

    // test timeout - timeout is a timestamp after 5 min
    cy.wait('@getTrustyAITimeout');

    projectDetailsSettingsTab.findTrustyAITimeoutError().should('exist');
  });

  it('Trusty AI not supported', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      inferenceServices: [],
      servingRuntimes: [],
      enableModelMesh: false,
    });

    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab.findTrustyAIInstallCheckbox().should('not.be.enabled');
  });

  it('Bias Metrics Show In Table', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: true,
    });

    modelMetricsConfigureSection.visit('test-project', 'test-inference-service');
    let row = modelMetricsConfigureSection.getMetricRow('Loan acceptance');

    row.findExpandButton().click();
    row.findExpansion().should('be.visible').should('contain.text', '0.1');

    row = modelMetricsConfigureSection.getMetricRow('Loan acceptance 2');
    row.findExpandButton().click();
    row.findExpansion().should('be.visible').should('contain.text', '0.2');

    row = modelMetricsConfigureSection.getMetricRow('Loan acceptance 2 STRICT');
    row.findExpandButton().click();
    row.findExpansion().should('be.visible').should('contain.text', '0.1');

    row = modelMetricsConfigureSection.getMetricRow('Loan Acceptance 4');
    row.findExpandButton().click();
    row.findExpansion().should('be.visible').should('contain.text', '0.4');
  });

  it('Configure Bias Metric', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      hasServingData: false,
      hasBiasData: true,
    });

    modelMetricsConfigureSection.visit('test-project', 'test-inference-service');
    modelMetricsConfigureSection.findConfigureMetricButton().click();
    configureBiasMetricModal.shouldBeOpen();
    configureBiasMetricModal.findSubmitButton().should('be.disabled');

    configureBiasMetricModal.findMetricNameInput().type('Test Metric');
    configureBiasMetricModal
      .findMetricTypeSelect()
      .findSelectOption(
        'Disparate impact ratio (DIR) Calculates the ratio between the proportion of the privileged and unprivileged groups getting a particular outcome.',
      )
      .click();
    configureBiasMetricModal.findSubmitButton().should('be.disabled');
    configureBiasMetricModal.findProtectedAttributeInput().type('customer_data_input-3');
    configureBiasMetricModal.findPrivilegedValueInput().type('1');
    configureBiasMetricModal.findUnprivilegedValueInput().type('0');
    configureBiasMetricModal.findOutputInput().type('predict');
    configureBiasMetricModal.findOutputValueInput().type('1');
    configureBiasMetricModal.findSubmitButton().should('be.enabled');
    configureBiasMetricModal.findViolationThresholdInput().type('0.1');
    configureBiasMetricModal.findMetricBatchSizeInput().clear().type('100');
    configureBiasMetricModal.findSubmitButton().should('be.enabled');

    // test invalid inputs
    configureBiasMetricModal.findViolationThresholdInput().clear().type('3');
    configureBiasMetricModal.findSubmitButton().should('be.disabled');
    configureBiasMetricModal.findViolationThresholdInput().clear().type('0.1');
    configureBiasMetricModal.findSubmitButton().should('be.enabled');

    configureBiasMetricModal.findMetricBatchSizeInput().clear().type('0');
    configureBiasMetricModal.findSubmitButton().should('be.disabled');
    configureBiasMetricModal.findMetricBatchSizeInput().clear().type('2');

    cy.interceptOdh(
      'POST /api/service/trustyai/:namespace/trustyai-service/metrics/dir/request',
      { path: { namespace: 'test-project' } },
      {},
    ).as('configureBiasMetric');

    configureBiasMetricModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@configureBiasMetric').then((interception) => {
      expect(interception.request.body).to.eql({
        modelId: 'test-inference-service',
        requestName: 'Test Metric',
        protectedAttribute: 'customer_data_input-3',
        privilegedAttribute: 1,
        unprivilegedAttribute: 0,
        outcomeName: 'predict',
        favorableOutcome: 1,
        thresholdDelta: 0.1,
        batchSize: 20,
      });
    });
  });
});

describe('KServe performance metrics', () => {
  it('should inform user when area disabled', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: true,
      hasServingData: false,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });
    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.findKserveAreaDisabledCard().should('be.visible');
  });

  it('should show error when ConfigMap is missing', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: true,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'test-project',
        name: 'test-inference-service-metrics-dashboard',
      },
      { statusCode: 404, body: mock404Error({}) },
    );

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.findUnknownErrorCard().should('be.visible');
  });

  it('should inform user when serving runtime is unsupported', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: true,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(ConfigMapModel, mockKserveMetricsConfigMap({ supported: false }));

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.findUnsupportedRuntimeCard().should('be.visible');
  });

  it('should handle a malformed graph definition gracefully', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: true,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(
      ConfigMapModel,
      mockKserveMetricsConfigMap({ config: MOCK_KSERVE_METRICS_CONFIG_2 }),
    );

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.findUnknownErrorCard().should('be.visible');
  });

  it('should display only 2 graphs, when the config specifies', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: true,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(
      ConfigMapModel,
      mockKserveMetricsConfigMap({ config: MOCK_KSERVE_METRICS_CONFIG_3 }),
    );

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.getMetricsChart('Number of incoming requests').shouldHaveData();
    modelMetricsKserve.getMetricsChart('Mean Model Latency').shouldHaveData();
    modelMetricsKserve.getAllMetricsCharts().should('have.length', 2);
  });

  it('charts should show data when serving data is available', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: true,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(ConfigMapModel, mockKserveMetricsConfigMap({ supported: true }));

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.getMetricsChart('Number of incoming requests').shouldHaveData();
    modelMetricsKserve.getMetricsChart('Mean Model Latency').shouldHaveData();
    modelMetricsKserve.getMetricsChart('CPU usage').shouldHaveData();
    modelMetricsKserve.getMetricsChart('Memory usage').shouldHaveData();
    modelMetricsKserve.getAllMetricsCharts().should('have.length', 4);
  });

  it('charts should show empty state when no serving data is available', () => {
    initIntercepts({
      disableBiasMetrics: false,
      disablePerformanceMetrics: false,
      disableKServeMetrics: false,
      hasServingData: false,
      hasBiasData: false,
      inferenceServices: [mockInferenceServiceK8sResource({ isModelMesh: false })],
    });

    cy.interceptK8s(ConfigMapModel, mockKserveMetricsConfigMap({ supported: true }));

    modelMetricsKserve.visit('test-project', 'test-inference-service');
    modelMetricsKserve.getMetricsChart('Number of incoming requests').shouldHaveNoData();
    modelMetricsKserve.getMetricsChart('Mean Model Latency').shouldHaveNoData();
    modelMetricsKserve.getMetricsChart('CPU usage').shouldHaveNoData();
    modelMetricsKserve.getMetricsChart('Memory usage').shouldHaveNoData();
  });
});
