/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import {
  buildMockPipelineVersion,
  buildMockPipelineVersions,
} from '#~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { buildMockRecurringRunKF } from '#~/__mocks__/mockRecurringRunKF';
import { mockPodLogs } from '#~/__mocks__/mockPodLogs';
import {
  pipelineDetails,
  pipelineRecurringRunDetails,
  pipelineRunDetails,
  pipelineVersionImportModal,
} from '#~/__tests__/cypress/cypress/pages/pipelines';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import { mockPipelinePodK8sResource } from '#~/__mocks__/mockPipelinePodK8sResource';
import { buildMockExperimentKF, buildMockPipeline } from '#~/__mocks__';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import {
  DataSciencePipelineApplicationModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { RecurringRunStatus } from '#~/concepts/pipelines/kfTypes';
import { initMlmdIntercepts } from '#~/__tests__/cypress/cypress/tests/mocked/pipelines/mlmdUtils';

const projectId = 'test-project';
const mockPipeline = buildMockPipeline({
  pipeline_id: 'test-pipeline',
  display_name: 'test-pipeline',
});
const mockVersion = buildMockPipelineVersion({
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: 'test-version-id',
  display_name: 'test-version-name',
});
const mockVersion2 = buildMockPipelineVersion({
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: 'test-version-id-2',
  display_name: 'test-version-2',
});
const mockRun = buildMockRunKF({
  display_name: 'test-pipeline-run',
  run_id: 'test-pipeline-run-id',
  runtime_config: {
    parameters: {
      min_max_scaler: false,
      neighbors: 1,
      standard_scaler: '["test-1", "test-2", "test-3", "test-4"]',
    },
  },
  pipeline_version_reference: {
    pipeline_id: mockPipeline.pipeline_id,
    pipeline_version_id: mockVersion.pipeline_version_id,
  },
});
const mockRecurringRun = buildMockRecurringRunKF({
  display_name: 'test-pipeline',
  recurring_run_id: 'test-pipeline',
  pipeline_version_reference: {
    pipeline_id: mockPipeline.pipeline_id,
    pipeline_version_id: mockVersion.pipeline_version_id,
  },
  experiment_id: 'test-experiment',
});

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { 'data-science-pipelines-operator': true },
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: projectId })]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectId,
      name: 'pipelines-definition',
    }),
  );

  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({ namespace: projectId })]),
  );

  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectId }),
  );
  cy.interceptK8s(
    SecretModel,
    mockSecretK8sResource({ namespace: projectId, name: 'ds-pipeline-config' }),
  );
  cy.interceptK8s(
    SecretModel,
    mockSecretK8sResource({ namespace: projectId, name: 'aws-connection-testdb' }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectId,
    }),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
    },
    mockPipeline,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    { path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id } },
    buildMockPipelineVersions([mockVersion, mockVersion2]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
    {
      path: {
        namespace: projectId,
        serviceName: 'dspa',
        recurringRunId: mockRecurringRun.recurring_run_id,
      },
    },
    mockRecurringRun,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
    {
      path: { namespace: projectId, serviceName: 'dspa', runId: mockRun.run_id },
    },
    mockRun,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectId,
        serviceName: 'dspa',
        pipelineId: mockPipeline.pipeline_id,
        pipelineVersionId: mockVersion.pipeline_version_id,
      },
    },
    mockVersion,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
    {
      path: {
        namespace: projectId,
        serviceName: 'dspa',
        experimentId: 'test-experiment',
      },
    },
    buildMockExperimentKF({ experiment_id: 'test-experiment' }),
  );
  cy.interceptK8s(
    PodModel,
    mockPipelinePodK8sResource({
      namespace: projectId,
      name: 'iris-training-pipeline-v4zp7-2757091352',
    }),
  );

  cy.interceptK8s(
    {
      model: PodModel,
      path: 'log',
      name: 'iris-training-pipeline-v4zp7-2757091352',
      ns: projectId,
      queryParams: {
        container: 'step-main',
        tailLines: '500',
      },
    },
    mockPodLogs({
      namespace: projectId,
      podName: 'iris-training-pipeline-v4zp7-2757091352',
      containerName: 'step-main',
    }),
  ).as('logsLoaded');
};

describe('Pipeline topology', () => {
  describe('Pipeline details', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineDetails.visit(projectId, mockVersion.pipeline_id, mockVersion.pipeline_version_id);
    });
    describe('Navigation', () => {
      it('renders the project navigator link', () => {
        pipelineDetails.findProjectNavigatorLink().should('exist');
      });

      it('Test pipeline details create run navigation', () => {
        pipelineDetails.selectActionDropdownItem('Create run');
        verifyRelativeURL(`/develop-train/pipelines/runs/${projectId}/runs/create`);
      });

      it('navigates to "Schedule run" page on "Schedule run" click', () => {
        pipelineDetails.selectActionDropdownItem('Create schedule');
        verifyRelativeURL(`/develop-train/pipelines/runs/${projectId}/schedules/create`);
      });

      it('Test pipeline details view runs navigation', () => {
        pipelineDetails.selectActionDropdownItem('View runs');
        verifyRelativeURL(
          `/develop-train/pipelines/runs/${projectId}/runs/active?pipeline_version=${mockVersion.pipeline_version_id}`,
        );
      });

      it('navigates to "Schedules" on "View schedules" click', () => {
        pipelineDetails.selectActionDropdownItem('View schedules');
        verifyRelativeURL(
          `/develop-train/pipelines/runs/${projectId}/schedules?pipeline_version=${mockVersion.pipeline_version_id}`,
        );
      });
    });

    it('validate clicking on node will open a drawer from right with data.', () => {
      pipelineDetails.findTaskNode('create-dataset').click();
      const taskDrawer = pipelineDetails.getTaskDrawer();
      taskDrawer.shouldHaveTaskName('create-dataset ');
      taskDrawer.findInputArtifacts().should('not.exist');
      taskDrawer.findOutputParameters().should('not.exist');
      taskDrawer.findOutputArtifacts().should('exist');
      taskDrawer.findCommandCodeBlock().should('not.be.empty');
      taskDrawer.findArgumentCodeBlock().should('not.be.empty');
      taskDrawer.findTaskImage().should('have.text', 'Imagequay.io/hukhan/iris-base:1');
      taskDrawer.findCloseDrawerButton().click();
      taskDrawer.find().should('not.exist');
    });

    it('delete pipeline version from action dropdown', () => {
      pipelineDetails.selectActionDropdownItem('Delete pipeline version');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(mockVersion.display_name);
      cy.interceptOdh(
        'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockVersion.pipeline_version_id,
          },
        },
        {},
      ).as('deletePipelineVersion');

      deleteModal.findSubmitButton().click();
      cy.wait('@deletePipelineVersion');
    });

    it('page details are updated when a new pipeline version is selected', () => {
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockVersion2.pipeline_version_id,
          },
        },
        mockVersion2,
      );
      pipelineDetails.selectPipelineVersionByName(mockVersion2.display_name);
      pipelineDetails.findPageTitle().should('have.text', 'test-version-2');
      verifyRelativeURL(
        `/develop-train/pipelines/definitions/${projectId}/${mockPipeline.pipeline_id}/${mockVersion2.pipeline_version_id}/view`,
      );
    });

    it('page details are updated after uploading a new version', () => {
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockVersion2.pipeline_version_id,
          },
        },
        mockVersion2,
      );
      pipelineDetails.findPageTitle().should('have.text', 'test-version-name');
      pipelineDetails.selectActionDropdownItem('Upload new version');
      pipelineVersionImportModal.findImportPipelineRadio().check();
      pipelineVersionImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
      cy.interceptOdh(
        'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        mockVersion2,
      ).as('uploadNewPipelineVersion');

      pipelineVersionImportModal.submit();
      verifyRelativeURL(
        `/develop-train/pipelines/definitions/${projectId}/${mockPipeline.pipeline_id}/${mockVersion2.pipeline_version_id}/view`,
      );
      cy.wait('@uploadNewPipelineVersion').then((interception) => {
        expect(interception.request.body).to.containSubset({
          pipeline_id: 'test-pipeline',
          description: '',
          package_url: { pipeline_url: 'https://example.com/pipeline.yaml' },
        });
      });
      pipelineDetails.findPageTitle().should('have.text', 'test-version-2');
    });

    it('validate for Yaml tab in pipeline details tab', () => {
      pipelineDetails.findYamlTab().click();
      const pipelineDashboardCodeEditor = pipelineDetails.getPipelineDashboardCodeEditor();
      pipelineDashboardCodeEditor.findInput().should('not.be.empty');
    });
  });

  describe('Pipeline run details', () => {
    describe('Navigation', () => {
      beforeEach(() => {
        initIntercepts();
      });

      it('renders the project navigator link', () => {
        pipelineRunDetails.visit(projectId, mockRun.run_id);
        pipelineRunDetails.findProjectNavigatorLink().should('exist');
      });

      it('Test pipeline run duplicate navigation', () => {
        pipelineRunDetails.visit(projectId, mockRun.run_id);
        pipelineRunDetails.selectActionDropdownItem('Duplicate');
        verifyRelativeURL(
          `/develop-train/pipelines/runs/${projectId}/runs/duplicate/${mockRun.run_id}`,
        );
      });

      it('Test pipeline recurring run duplicate navigation', () => {
        pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);
        pipelineRecurringRunDetails.selectActionDropdownItem('Duplicate');
        verifyRelativeURL(
          `/develop-train/pipelines/runs/${projectId}/schedules/duplicate/${mockRecurringRun.recurring_run_id}`,
        );
      });

      it('Test pipeline recurring run delete navigation', () => {
        pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);
        pipelineRecurringRunDetails.selectActionDropdownItem('Delete');
        deleteModal.shouldBeOpen();
        deleteModal.findInput().type(mockPipeline.display_name);

        cy.interceptOdh(
          'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
          {
            path: {
              namespace: projectId,
              serviceName: 'dspa',
              recurringRunId: mockPipeline.pipeline_id,
            },
          },
          {},
        ).as('deletePipelineRecurringRun');

        deleteModal.findSubmitButton().click();
        cy.wait('@deletePipelineRecurringRun');
      });

      it('Test pipeline recurring run details project navigation', () => {
        pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

        pipelineRecurringRunDetails.findDetailsTab().click();
        pipelineRecurringRunDetails.findDetailItem('Project').findValue().find('a').click();
        verifyRelativeURL(`/projects/${projectId}`);
      });

      it('Test pipeline recurring run details pipeline version navigation', () => {
        pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

        pipelineRecurringRunDetails.findDetailsTab().click();
        pipelineRecurringRunDetails
          .findDetailItem('Pipeline version')
          .findValue()
          .find('a')
          .click();
        verifyRelativeURL(
          `/develop-train/pipelines/definitions/${projectId}/${
            mockRecurringRun.pipeline_version_reference.pipeline_id
          }/${mockRecurringRun.pipeline_version_reference.pipeline_version_id ?? ''}/view`,
        );
      });
    });

    it('Test pipeline recurring run tab parameters', () => {
      initIntercepts();

      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);
      pipelineRecurringRunDetails.findDetailsTab().click();
      pipelineRecurringRunDetails.findInputParameterTab().click();
      pipelineRecurringRunDetails.findDetailItem('min_max_scaler').findValue().contains('False');
      pipelineRecurringRunDetails.findDetailItem('neighbors').findValue().contains('0');
    });

    it('Test pipeline recurring run tab details', () => {
      initIntercepts();

      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

      pipelineRecurringRunDetails.findDetailsTab().click();
      pipelineRecurringRunDetails
        .findDetailItem('Name')
        .findValue()
        .contains(mockRecurringRun.display_name);
      pipelineRecurringRunDetails.findDetailItem('Project').findValue().contains('Test Project');
      pipelineRecurringRunDetails
        .findDetailItem('Run ID')
        .findValue()
        .contains(mockRecurringRun.display_name);
      pipelineRecurringRunDetails
        .findDetailItem('Pipeline version')
        .findValue()
        .contains('test-version-name');
      pipelineRecurringRunDetails.findDetailItem('Pipeline').findValue().contains('test-pipeline');
      pipelineRecurringRunDetails
        .findDetailItem('Workflow name')
        .findValue()
        .contains('test-pipeline');
      pipelineRecurringRunDetails
        .findDetailItem('Created')
        .findValue()
        .contains('February 8, 2024');
      pipelineRecurringRunDetails.findDetailItem('Run trigger enabled').findValue().contains('Yes');
      pipelineRecurringRunDetails.findDetailItem('Trigger').findValue().contains('Every 1 minute');
    });

    it('Ensure that clicking on a node will open a right-side drawer', () => {
      initIntercepts();

      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

      pipelineDetails.findTaskNode('create-dataset').click();
      const taskDrawer = pipelineDetails.getTaskDrawer();
      taskDrawer.shouldHaveTaskName('create-dataset ');
      taskDrawer.findInputArtifacts().should('not.exist');
      taskDrawer.findOutputParameters().should('not.exist');
      taskDrawer.findOutputArtifacts().should('exist');
      taskDrawer.findCommandCodeBlock().should('not.be.empty');
      taskDrawer.findArgumentCodeBlock().should('not.be.empty');
      taskDrawer.findTaskImage().should('have.text', 'Imagequay.io/hukhan/iris-base:1');
      taskDrawer.findCloseDrawerButton().click();
      taskDrawer.find().should('not.exist');
    });

    it('Test pipeline triggered run tab details', () => {
      initIntercepts();

      pipelineRunDetails.visit(projectId, mockRun.run_id);

      pipelineRecurringRunDetails.findPipelineSpecTab();
      pipelineRunDetails.findDetailsTab().click();
      pipelineRunDetails.findDetailItem('Name').findValue().contains(mockRecurringRun.display_name);
      pipelineRunDetails
        .findDetailItem('Pipeline version')
        .findValue()
        .contains('test-version-name');
      pipelineRunDetails.findDetailItem('Pipeline').findValue().contains('test-pipeline');
      pipelineRunDetails.findDetailItem('Project').findValue().contains('Test Project');
      pipelineRunDetails
        .findDetailItem('Run ID')
        .findValue()
        .contains(mockRecurringRun.display_name);
      pipelineRunDetails.findDetailItem('Workflow name').findValue().contains('test-pipeline');
      pipelineRunDetails
        .findDetailItem('Started')
        .findValue()
        .contains('Friday, March 15, 2024 at 5:59:35 PM UTC');
      pipelineRunDetails
        .findDetailItem('Finished')
        .findValue()
        .contains('Friday, March 15, 2024 at 6:00:25 PM UTC');
      pipelineRunDetails.findDetailItem('Duration').findValue().contains('50 seconds');
    });

    it('Test pipeline triggered run tab parameters', () => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
      pipelineRunDetails.findInputParameterTab().click();
      pipelineRunDetails.findDetailItem('min_max_scaler').findValue().contains('False');
      pipelineRunDetails.findDetailItem('neighbors').findValue().contains('1');
      pipelineRecurringRunDetails
        .findDetailItem('standard_scaler')
        .shouldHaveCodeEditorValue('test-1');
    });

    it('Test pipeline triggered run YAML output', () => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);

      pipelineRunDetails.findPipelineSpecTab().click();
      pipelineRunDetails.findYamlOutput().click();
      const pipelineDashboardCodeEditor = pipelineDetails.getPipelineDashboardCodeEditor();
      pipelineDashboardCodeEditor.findInput().should('not.be.empty');
    });
  });

  describe('Pipeline recurring run details', () => {
    const mockDisabledRecurringRun = { ...mockRecurringRun, status: RecurringRunStatus.DISABLED };

    beforeEach(() => {
      initIntercepts();
    });

    it('renders the project navigator link', () => {
      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);
      pipelineRecurringRunDetails.findProjectNavigatorLink().should('exist');
    });

    it('disables recurring run from action dropdown', () => {
      pipelineRecurringRunDetails.mockDisableRecurringRun(mockRecurringRun, projectId);
      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

      pipelineRecurringRunDetails.selectActionDropdownItem('Disable');

      pipelineRecurringRunDetails.findActionsDropdown().click();
      cy.get('[id="dashboard-page-main"]')
        .findByRole('menuitem', { name: 'Enable' })
        .should('be.visible');
    });

    it('enables recurring run from action dropdown', () => {
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            recurringRunId: mockDisabledRecurringRun.recurring_run_id,
          },
        },
        mockDisabledRecurringRun,
      );
      pipelineRecurringRunDetails.mockEnableRecurringRun(mockDisabledRecurringRun, projectId);
      pipelineRecurringRunDetails.visit(projectId, mockRecurringRun.recurring_run_id);

      pipelineRecurringRunDetails.selectActionDropdownItem('Enable');

      pipelineRecurringRunDetails.findActionsDropdown().click();
      cy.get('[id="dashboard-page-main"]')
        .findByRole('menuitem', { name: 'Disable' })
        .should('be.visible');
    });
  });

  describe('Pipeline run Input/Output', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
    });

    it('Test with input/output artifacts', () => {
      pipelineRunDetails.findTaskNode('create-dataset').click();
      const rightDrawer = pipelineRunDetails.findRightDrawer();
      rightDrawer.findRightDrawerInputOutputTab().should('be.visible');
      rightDrawer.findRightDrawerInputOutputTab().click();
      pipelineDetails.findRunTaskRightDrawer();
      pipelineRunDetails
        .findOutputArtifacts()
        .should('contain', 'Output artifacts')
        .should('contain', 'iris_dataset');

      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      rightDrawer.findRightDrawerInputOutputTab().should('be.visible');
      pipelineDetails.findRunTaskRightDrawer();
      pipelineRunDetails
        .findInputArtifacts()
        .should('contain', 'Input artifacts')
        .should('contain', 'input_iris_dataset');
    });
  });

  describe('Pipeline run Details', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
    });

    it('Test with the details', () => {
      pipelineRunDetails.findTaskNode('create-dataset').click();
      const rightDrawer = pipelineRunDetails.findRightDrawer();
      rightDrawer.findRightDrawerDetailsTab().should('be.visible');
      rightDrawer.findRightDrawerDetailsTab().click();
      rightDrawer
        .findRightDrawerDetailItem('Task ID')
        .findValue()
        .should('contain', 'task.create-dataset');

      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      pipelineRunDetails.findRightDrawer().findRightDrawerDetailsTab().should('be.visible');
      rightDrawer
        .findRightDrawerDetailItem('Task ID')
        .findValue()
        .should('contain', 'task.normalize-dataset');
    });
  });

  describe('Pipeline run volume mounts', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
    });

    it('Test node with no volume mounts', () => {
      pipelineRunDetails.findTaskNode('create-dataset').click();
      const rightDrawer = pipelineRunDetails.findRightDrawer();
      rightDrawer.findRightDrawerVolumesTab().should('be.visible');
      rightDrawer.findRightDrawerVolumesTab().should('be.disabled');
    });

    it('Test node with volume mounts', () => {
      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      const rightDrawer = pipelineRunDetails.findRightDrawer();
      rightDrawer.findRightDrawerVolumesTab().should('be.visible');
      rightDrawer.findRightDrawerVolumesTab().click();
      rightDrawer
        .findRightDrawerDetailItem('/data/1')
        .findValue()
        .should('contain', 'create-dataset');
      // Close the side drawer to uncover the 'train-model' node
      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      pipelineRunDetails.findTaskNode('train-model').click();
      rightDrawer.findRightDrawerVolumesTab().click();
      rightDrawer
        .findRightDrawerDetailItem('/data/2')
        .findValue()
        .should('contain', 'normalize-dataset');
    });
  });

  describe('Pipelines logs', () => {
    const navigateToLogsTab = () => {
      pipelineRunDetails.visit(projectId, mockRun.run_id);
      pipelineRunDetails.findTaskNode('create-dataset').click();
      const rightDrawer = pipelineRunDetails.findRightDrawer();
      rightDrawer.findRightDrawerDetailsTab().should('be.visible');
      rightDrawer.findRightDrawerLogsTab().should('be.visible');
      rightDrawer.findRightDrawerLogsTab().click();
    };

    beforeEach(() => {
      initIntercepts();
    });

    it('test cached logs', () => {
      initMlmdIntercepts(projectId);
      navigateToLogsTab();
      pipelineRunDetails.findLogsCachedAlert().should('be.visible');
    });

    it('test logs paused while loading', () => {
      cy.interceptK8s(
        PodModel,
        mockPipelinePodK8sResource({
          namespace: projectId,
          name: 'iris-training-pipeline-v4zp7-2757091352',
          isPending: true,
        }),
      ).as('podLoading');
      navigateToLogsTab();

      pipelineRunDetails
        .findLogs()
        .contains(
          'sample log for namespace test-project, pod name iris-training-pipeline-v4zp7-2757091352 and for step step-main',
        );
      cy.wait('@podLoading');

      cy.interceptK8s(
        PodModel,
        mockPipelinePodK8sResource({
          namespace: projectId,
          name: 'iris-training-pipeline-v4zp7-2757091352',
          isPending: false,
        }),
      ).as('podTerminated');

      cy.wait('@podTerminated');

      pipelineRunDetails.findLogsPauseButton().should('not.exist');
    });

    it('test whether the logs load in Logs tab', () => {
      navigateToLogsTab();

      pipelineRunDetails.findLogsSuccessAlert().should('be.visible');

      pipelineRunDetails
        .findLogs()
        .should('be.visible')
        .contains(
          'sample log for namespace test-project, pod name iris-training-pipeline-v4zp7-2757091352 and for step step-main',
        )
        .and(($el) => {
          expect($el.width()).to.be.greaterThan(0);
          expect($el.height()).to.be.greaterThan(0);
        });

      // test whether single step logs download dropdown item is enabled when logs are available
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.be.disabled');
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.exist');
      // test whether the raw logs dropdown item is enabled when logs are available
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.be.disabled');
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.exist');
    });

    it('test logs of another step', () => {
      navigateToLogsTab();

      pipelineRunDetails.findLogsSuccessAlert().should('be.visible');

      pipelineRunDetails.findStepSelect().should('not.be.disabled');
      pipelineRunDetails.selectStepByName('step-copy-artifacts');
      pipelineRunDetails.findLogs().contains('No logs available');
      // test whether single step logs download dropdown item is disabled when logs are not available
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.be.enabled');
      pipelineRunDetails.findDownloadStepsToggle().click();
      // test whether the raw logs dropdown item is disabled when logs are not available
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.be.enabled');
      pipelineRunDetails.findLogsKebabToggle().click();
    });
  });
});
