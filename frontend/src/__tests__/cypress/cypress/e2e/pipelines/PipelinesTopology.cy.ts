/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipelineVersionV2 } from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { buildMockJobKF } from '~/__mocks__/mockJobKF';
import { mockPodLogs } from '~/__mocks__/mockPodLogs';
import {
  pipelineDetails,
  pipelineRunJobDetails,
  pipelineRunDetails,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { buildMockRunKF } from '~/__mocks__/mockRunKF';
import { mockPipelinePodK8sResource } from '~/__mocks__/mockPipelinePodK8sResource';
import { buildMockPipelineV2 } from '~/__mocks__';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import {
  DataSciencePipelineApplicationModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';

const projectId = 'test-project';
const mockPipeline = buildMockPipelineV2({
  pipeline_id: 'test-pipeline',
  display_name: 'test-pipeline',
});
const mockVersion = buildMockPipelineVersionV2({
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: 'test-version-id',
  display_name: 'test-version-name',
});
const mockRun = buildMockRunKF({
  display_name: 'test-pipeline-run',
  run_id: 'test-pipeline-run-id',
  pipeline_version_reference: {
    pipeline_id: mockPipeline.pipeline_id,
    pipeline_version_id: mockVersion.pipeline_version_id,
  },
});
const mockJob = buildMockJobKF({
  display_name: 'test-pipeline',
  recurring_run_id: 'test-pipeline',
  pipeline_version_reference: {
    pipeline_id: mockPipeline.pipeline_id,
    pipeline_version_id: mockVersion.pipeline_version_id,
  },
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
  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/pipelines`,
    },
    { pipelines: [mockPipeline] },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/pipelines/${mockPipeline.pipeline_id}`,
    },
    mockPipeline,
  );

  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/recurringruns/${mockJob.recurring_run_id}`,
    },
    mockJob,
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/recurringruns`,
    },
    { recurringRuns: [mockJob] },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/runs/${mockRun.run_id}`,
    },
    mockRun,
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/runs`,
    },
    { runs: [mockRun] },
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/pipelines/${mockPipeline.pipeline_id}/versions`,
    },
    [mockVersion],
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectId}/dspa/apis/v2beta1/pipelines/${mockPipeline.pipeline_id}/versions/${mockVersion.pipeline_version_id}`,
    },
    mockVersion,
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
  );
};

describe('Pipeline topology', () => {
  describe('Pipeline details', () => {
    describe('Navigation', () => {
      beforeEach(() => {
        initIntercepts();
        pipelineDetails.visit(projectId, mockVersion.pipeline_id, mockVersion.pipeline_version_id);
        // https://issues.redhat.com/browse/RHOAIENG-4562
        // Bypass intermittent Cypress error:
        // Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs/base/worker/workerMain.js' failed to load.
        Cypress.on('uncaught:exception', () => false);
      });

      it('Test pipeline details create run navigation', () => {
        pipelineDetails.selectActionDropdownItem('Create run');
        verifyRelativeURL(`/pipelineRuns/${projectId}/pipelineRun/create`);
      });

      it('navigates to "Schedule run" page on "Schedule run" click', () => {
        pipelineDetails.selectActionDropdownItem('Schedule run');
        verifyRelativeURL(`/pipelineRuns/${projectId}/pipelineRun/create?runType=scheduled`);
      });

      it('Test pipeline details view runs navigation', () => {
        pipelineDetails.selectActionDropdownItem('View runs');
        verifyRelativeURL(`/pipelineRuns/${projectId}?runType=active`);
      });

      it('navigates to "Schedules" on "View schedules" click', () => {
        pipelineDetails.selectActionDropdownItem('View schedules');
        verifyRelativeURL(`/pipelineRuns/${projectId}?runType=scheduled`);
      });
    });
  });

  describe('Pipeline run details', () => {
    describe('Navigation', () => {
      beforeEach(() => {
        initIntercepts();
      });

      it('Test pipeline run duplicate navigation', () => {
        pipelineRunDetails.visit(projectId, mockRun.run_id);
        pipelineRunDetails.selectActionDropdownItem('Duplicate');
        verifyRelativeURL(`/pipelineRuns/${projectId}/pipelineRun/clone/${mockRun.run_id}`);
      });

      it('Test pipeline job duplicate navigation', () => {
        pipelineRunJobDetails.visit(projectId, mockJob.recurring_run_id);
        pipelineRunJobDetails.selectActionDropdownItem('Duplicate');
        verifyRelativeURL(
          `/pipelineRuns/${projectId}/pipelineRun/cloneJob/${mockJob.recurring_run_id}?runType=scheduled`,
        );
      });

      it('Test pipeline job bottom drawer project navigation', () => {
        pipelineRunJobDetails.visit(projectId, mockJob.recurring_run_id);

        pipelineRunJobDetails.findBottomDrawer().findBottomDrawerDetailsTab().click();
        pipelineRunJobDetails
          .findBottomDrawer()
          .findBottomDrawerDetailItem('Project')
          .findValue()
          .find('a')
          .click();
        verifyRelativeURL(`/projects/${projectId}?section=overview`);
      });

      it('Test pipeline job bottom drawer pipeline version navigation', () => {
        pipelineRunJobDetails.visit(projectId, mockJob.recurring_run_id);

        pipelineRunJobDetails.findBottomDrawer().findBottomDrawerDetailsTab().click();
        pipelineRunJobDetails
          .findBottomDrawer()
          .findBottomDrawerDetailItem('Pipeline version')
          .findValue()
          .find('a')
          .click();
        verifyRelativeURL(
          `/pipelines/${projectId}/pipeline/view/${mockJob.pipeline_version_reference.pipeline_id}/${mockJob.pipeline_version_reference.pipeline_version_id}`,
        );
      });
    });

    it('Test pipeline job bottom drawer details', () => {
      initIntercepts();

      pipelineRunJobDetails.visit(projectId, mockJob.recurring_run_id);

      pipelineRunJobDetails.findBottomDrawer().findBottomDrawerDetailsTab().click();
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Name')
        .findValue()
        .contains(mockJob.display_name);
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Project')
        .findValue()
        .contains('Test Project');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Run ID')
        .findValue()
        .contains(mockJob.display_name);
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Workflow name')
        .findValue()
        .contains('test-pipeline');
    });

    it('Test pipeline job bottom drawer parameters', () => {
      initIntercepts();

      pipelineRunJobDetails.visit(projectId, mockJob.recurring_run_id);

      pipelineRunJobDetails.findBottomDrawer().findBottomDrawerInputTab().click();
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('min_max_scaler')
        .findValue()
        .contains('False');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('neighbors')
        .findValue()
        .contains('0');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('standard_scaler')
        .findValue()
        .contains('yes');
    });

    it('Test pipeline triggered run bottom drawer details', () => {
      initIntercepts();

      pipelineRunDetails.visit(projectId, mockRun.run_id);

      pipelineRunJobDetails.findBottomDrawer().findBottomDrawerYamlTab();
      pipelineRunDetails.findBottomDrawer().findBottomDrawerDetailsTab().click();
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Name')
        .findValue()
        .contains(mockJob.display_name);
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Project')
        .findValue()
        .contains('Test Project');
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Run ID')
        .findValue()
        .contains(mockJob.display_name);
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Workflow name')
        .findValue()
        .contains('test-pipeline');
    });

    it('Test pipeline triggered run bottom drawer parameters', () => {
      initIntercepts();

      pipelineRunDetails.visit(projectId, mockRun.run_id);

      pipelineRunDetails.findBottomDrawer().findBottomDrawerInputTab().click();
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('min_max_scaler')
        .findValue()
        .contains('False');
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('neighbors')
        .findValue()
        .contains('1');
      pipelineRunDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('standard_scaler')
        .findValue()
        .contains('False');
    });
  });

  describe('Pipeline run volume mounts', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
    });

    it('Test node with no volume mounts', () => {
      pipelineRunDetails.findTaskNode('create-dataset').click();
      pipelineRunDetails.findRightDrawer().findRightDrawerVolumesTab().should('be.visible');
      pipelineRunDetails.findRightDrawer().findRightDrawerVolumesTab().click();
      pipelineRunDetails
        .findRightDrawer()
        .findRightDrawerVolumesSection()
        .should('contain.text', 'No content');
    });

    it('Test node with volume mounts', () => {
      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      pipelineRunDetails.findRightDrawer().findRightDrawerVolumesTab().should('be.visible');
      pipelineRunDetails.findRightDrawer().findRightDrawerVolumesTab().click();
      pipelineRunDetails
        .findRightDrawer()
        .findRightDrawerDetailItem('/data/1')
        .findValue()
        .should('contain', 'create-dataset');
      // Close the side drawer to uncover the 'train-model' node
      pipelineRunDetails.findTaskNode('normalize-dataset').click();
      pipelineRunDetails.findTaskNode('train-model').click();
      pipelineRunDetails.findRightDrawer().findRightDrawerVolumesTab().click();
      pipelineRunDetails
        .findRightDrawer()
        .findRightDrawerDetailItem('/data/2')
        .findValue()
        .should('contain', 'normalize-dataset');
    });
  });

  describe('Pipelines logs', () => {
    beforeEach(() => {
      initIntercepts();
      pipelineRunDetails.visit(projectId, mockRun.run_id);
      pipelineRunDetails.findTaskNode('create-dataset').click();
      pipelineRunDetails.findRightDrawer().findRightDrawerDetailsTab().should('be.visible');
      pipelineRunDetails.findRightDrawer().findRightDrawerLogsTab().should('be.visible');
      pipelineRunDetails.findRightDrawer().findRightDrawerLogsTab().click();
      pipelineRunDetails.findLogsSuccessAlert().should('be.visible');
    });

    it('test whether the logs load in Logs tab', () => {
      pipelineRunDetails
        .findLogs()
        .contains(
          'sample log for namespace test-project, pod name iris-training-pipeline-v4zp7-2757091352 and for step step-main',
        );
      // test whether single step logs download dropdown item is enabled when logs are available
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.be.disabled');
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.exist');
      // test whether the raw logs dropddown item is enabled when logs are available
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.be.disabled');
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.exist');
    });

    it('test logs of another step', () => {
      pipelineRunDetails.findStepSelect().should('not.be.disabled');
      pipelineRunDetails.selectStepByName('step-copy-artifacts');
      pipelineRunDetails.findLogs().contains('No logs available');
      // test whether single step logs download dropdown item is disabled when logs are not available
      pipelineRunDetails.findDownloadStepsToggle().click();
      pipelineRunDetails.findCurrentStepLogs().should('not.be.enabled');
      pipelineRunDetails.findDownloadStepsToggle().click();
      // test whether the raw logs dropddown item is disabled when logs are not available
      pipelineRunDetails.findLogsKebabToggle().click();
      pipelineRunDetails.findRawLogs().should('not.be.enabled');
      pipelineRunDetails.findLogsKebabToggle().click();
    });
  });
});
