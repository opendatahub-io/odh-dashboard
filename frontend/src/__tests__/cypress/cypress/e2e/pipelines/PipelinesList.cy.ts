/* eslint-disable camelcase */
import { buildMockPipelineVersionV2, buildMockPipelineVersionsV2 } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock404Error } from '~/__mocks__/mockK8sStatus';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import {
  pipelinesTable,
  pipelinesGlobal,
  configurePipelineServerModal,
  viewPipelineServerModal,
  pipelineImportModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { pipelinesSection } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesSection';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  DataSciencePipelineApplicationModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

type HandlersProps = {
  isEmpty?: boolean;
};

const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const projectName = 'test-project';

const uploadPipelineParams = {
  display_name: 'New pipeline',
  description: 'New pipeline description',
};

const uploadVersionParams = {
  display_name: 'New pipeline version',
  description: 'New pipeline version description',
  pipeline_id: 'test-pipeline',
};

const mockPipelines: PipelineKFv2[] = [
  buildMockPipelineV2({
    display_name: 'Test pipeline',
    pipeline_id: 'test-pipeline',
  }),

  buildMockPipelineV2({
    display_name: 'Test pipeline 2',
    pipeline_id: 'test-pipeline-2',
  }),
];

const createPipelineAndVersionParams = {
  pipeline: {
    display_name: 'New pipeline',
  },
  pipeline_version: {
    display_name: 'New pipeline',
    package_url: {
      pipeline_url: 'https://example.com/pipeline.yaml',
    },
  },
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({ installedComponents: { 'data-science-pipelines-operator': true } }),
  );
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableModelServing: true }));
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));
  cy.interceptK8sList(RouteModel, mockK8sResourceList([mockNotebookK8sResource({})]));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
    }),
  );
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList(isEmpty ? [] : [mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ dspaSecretName: 'aws-connection-test' }),
  );
};

describe('PipelinesList', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptK8s(
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'pipelines-definition',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');
    pipelinesGlobal.findEmptyState().should('exist');
  });

  it('should show the configure pipeline server button when the server is not configured', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptK8s(
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'pipelines-definition',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findCreatePipelineButton().should('be.enabled');
  });

  it('should configure pipeline server', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection(projectName, 'pipelines-projects');

    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({}),
    );

    cy.interceptK8s(
      'POST',
      {
        model: SecretModel,
        ns: projectName,
      },
      mockSecretK8sResource({ namespace: projectName }),
    ).as('createSecret');

    cy.interceptK8s(
      'POST',
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ).as('createDSPA');

    configurePipelineServerModal.configurePipelineServer(projectName);
  });

  it('should configuring pipeline server to connect external DB', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection(projectName, 'pipelines-projects');

    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({}),
    );

    cy.interceptK8s(
      'POST',
      {
        model: SecretModel,
        ns: projectName,
      },
      mockSecretK8sResource({ namespace: projectName }),
    ).as('createSecret');

    cy.interceptK8s(
      'POST',
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ).as('createDSPA');

    pipelinesSection.findCreatePipelineButton().should('be.enabled');
    pipelinesSection.findCreatePipelineButton().click();

    configurePipelineServerModal.findAwsKeyInput().type('test-aws-key');
    configurePipelineServerModal.findAwsSecretKeyInput().type('test-secret-key');
    configurePipelineServerModal.findEndpointInput().type('https://s3.amazonaws.com/');
    configurePipelineServerModal.findRegionInput().should('have.value', 'us-east-1');
    configurePipelineServerModal.findBucketInput().type('test-bucket');

    configurePipelineServerModal.findToggleButton().click();
    configurePipelineServerModal.findExternalMYSQLDatabaseRadio().click();
    configurePipelineServerModal.findSubmitButton().should('be.disabled');

    configurePipelineServerModal.findHostInput().type('mysql');
    configurePipelineServerModal.findPortInput().type('3306');
    configurePipelineServerModal.findUsernameInput().type('test-user');
    configurePipelineServerModal.findPasswordInput().type('password');
    configurePipelineServerModal.findDatabaseInput().type('mlpipelines');

    configurePipelineServerModal.findSubmitButton().should('be.enabled');
    configurePipelineServerModal.findSubmitButton().click();

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'pipelines-db-password',
          namespace: projectName,
          annotations: {},
          labels: { 'opendatahub.io/dashboard': 'true' },
        },
        stringData: { 'db-password': 'password' },
      });
    });

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'dashboard-dspa-secret',
          namespace: projectName,
          annotations: {},
          labels: { 'opendatahub.io/dashboard': 'true' },
        },
        stringData: { AWS_ACCESS_KEY_ID: 'test-aws-key', AWS_SECRET_ACCESS_KEY: 'test-secret-key' },
      });
    });

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createSecret.all').then((interceptions) => {
      expect(interceptions).to.have.length(4); // 2 dry-run request and 2 actual request
    });

    cy.wait('@createDSPA').then((interception) => {
      expect(interception.request.body).to.containSubset({
        spec: {
          apiServer: { enableSamplePipeline: false },
          dspVersion: 'v2',
          objectStorage: {
            externalStorage: {
              host: 's3.us-east-1.amazonaws.com',
              scheme: 'https',
              bucket: 'test-bucket',
              region: 'us-east-1',
              s3CredentialsSecret: {
                accessKey: 'AWS_ACCESS_KEY_ID',
                secretKey: 'AWS_SECRET_ACCESS_KEY',
                secretName: 'test-secret',
              },
            },
          },
          database: {
            externalDB: {
              host: 'mysql',
              passwordSecret: { key: 'db-password', name: 'test-secret' },
              pipelineDBName: 'mlpipelines',
              port: '3306',
              username: 'test-user',
            },
          },
        },
      });
    });
  });

  it('should view pipeline server', () => {
    initIntercepts({});

    cy.interceptK8s(
      {
        model: SecretModel,
        ns: projectName,
      },
      mockSecretK8sResource({
        s3Bucket: 'c2RzZA==',
        namespace: projectName,
        name: 'aws-connection-test',
      }),
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    viewPipelineServerModal.viewPipelineServerDetails();
  });

  it('should delete pipeline server', () => {
    initIntercepts({});

    cy.interceptK8s(
      'DELETE',
      SecretModel,
      mockSecretK8sResource({ name: 'ds-pipeline-config', namespace: projectName }),
    ).as('deletePipelineConfig');
    cy.interceptK8s(
      'DELETE',
      SecretModel,
      mockSecretK8sResource({ name: 'pipelines-db-password', namespace: projectName }),
    ).as('deletePipelineDBPassword');
    cy.interceptK8s(
      'DELETE',
      SecretModel,
      mockSecretK8sResource({ name: 'dashboard-dspa-secret', namespace: projectName }),
    ).as('deleteDSPASecret');
    cy.interceptK8s(
      'DELETE',
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
    ).as('deleteDSPA');

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findInput().fill('Test Project pipeline server');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deletePipelineDBPassword');
    cy.wait('@deletePipelineConfig');
    cy.wait('@deleteDSPASecret');
    cy.wait('@deleteDSPA');
  });

  it('imports a new pipeline', () => {
    initIntercepts({});

    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([initialMockPipelineVersion]),
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelineImportModal.importNewPipeline(projectName, initialMockPipeline, uploadPipelineParams);
  });

  it('imports a new pipeline by url', () => {
    initIntercepts({});
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([initialMockPipelineVersion]),
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');
    pipelineImportModal.importPipelineFromUrl(
      projectName,
      initialMockPipeline,
      createPipelineAndVersionParams,
    );
  });

  it('uploads a new pipeline version', () => {
    initIntercepts({});
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([initialMockPipelineVersion]),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');

    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(mockPipelines),
    );

    pipelineImportModal.uploadPipelineVersion(
      projectName,
      initialMockPipeline,
      initialMockPipelineVersion,
      uploadVersionParams,
    );
  });

  it('should sort the table', () => {
    initIntercepts({});

    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(mockPipelines),
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.sortTable();
  });

  it('navigate to create run page from pipeline row', () => {
    initIntercepts({});

    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(mockPipelines),
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Create run')
      .click();
    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create`);
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    initIntercepts({});

    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(mockPipelines),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Schedule run')
      .click();

    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create?runType=scheduled`);
  });

  it('should disable the upload version button when the list is empty', () => {
    initIntercepts({});

    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({}),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([]),
    ).as('pipelines');
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findImportPipelineSplitButton().should('be.enabled').click();

    cy.wait('@pipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '5',
      });
    });

    pipelinesSection.findUploadVersionButton().should('have.attr', 'aria-disabled', 'true');
  });

  it('should show the ability to delete the pipeline server kebab option', () => {
    initIntercepts({});
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({ dspVersion: 'v1' })]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({ dspVersion: 'v1' }),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findAllActions().should('have.length', 1);
    pipelinesSection.findImportPipelineSplitButton().should('not.exist');
    pipelinesSection.findKebabActions().should('be.visible').should('be.enabled');
    pipelinesSection.findKebabActionItem('Delete pipeline server').should('be.visible');
  });

  it('should navigate to details page when clicking on the version name', () => {
    initIntercepts({});

    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({}),
    );
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([initialMockPipeline]),
    );

    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
      },
      buildMockPipelineVersionsV2([initialMockPipelineVersion]),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findPipelineName(initialMockPipelineVersion.display_name)
      .click();
    verifyRelativeURL(
      `/projects/${projectName}/pipeline/view/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });
});
