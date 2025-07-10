/* eslint-disable camelcase */
import {
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockSuccessGoogleRpcStatus,
  mockArgoWorkflowPipelineVersion,
} from '#~/__mocks__';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
  pipelineDeleteModal,
  configurePipelineServerModal,
  viewPipelineServerModal,
  PipelineSort,
  pipelineDetails,
} from '#~/__tests__/cypress/cypress/pages/pipelines';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import type { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { tablePagination } from '#~/__tests__/cypress/cypress/pages/components/Pagination';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { pipelineRunsGlobal } from '#~/__tests__/cypress/cypress/pages/pipelines/pipelineRunsGlobal';
import { argoAlert } from '#~/__tests__/cypress/cypress/pages/pipelines/argoAlert';
import { toastNotifications } from '#~/__tests__/cypress/cypress/pages/components/ToastNotifications';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersion({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const pipelineYamlPath = './cypress/tests/mocked/pipelines/mock-upload-pipeline.yaml';
const argoWorkflowPipeline = './cypress/tests/mocked/pipelines/argo-workflow-pipeline.yaml';
const tooLargePipelineYAMLPath = './cypress/tests/mocked/pipelines/not-a-pipeline-2-megabytes.yaml';
const v1PipelineYamlPath = './cypress/tests/mocked/pipelines/v1-pipeline.yaml';

describe('Pipelines', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.findEmptyState().should('exist');
    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
  });

  it('Configure pipeline server when viable connection exists', () => {
    initIntercepts({ isEmpty: true });

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

    pipelinesGlobal.visit(projectName);
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([mockSecretK8sResource({ namespace: projectName })]),
    ).as('refreshSecrets');

    cy.interceptK8sList(
      {
        model: SecretModel,
        ns: projectName,
      },
      mockK8sResourceList([
        mockSecretK8sResource({ s3Bucket: 'c2RzZA==', namespace: projectName }),
      ]),
    );

    cy.interceptK8sList(
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
      },
      mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
    );
    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
    pipelinesGlobal.findConfigurePipelineServerButton().click();
    configurePipelineServerModal.selectViableConnection('Test Secret •••••••••••••••••');
    configurePipelineServerModal.findAwsKeyInput().should('have.value', 'sdsd');
    configurePipelineServerModal.findShowPasswordButton().click();
    configurePipelineServerModal.findAwsSecretKeyInput().should('have.value', 'sdsd');
    configurePipelineServerModal
      .findEndpointInput()
      .should('have.value', 'https://s3.amazonaws.com/');
    configurePipelineServerModal.findRegionInput().should('have.value', 'us-east-1');
    configurePipelineServerModal.findBucketInput().should('have.value', 'sdsd');
    configurePipelineServerModal.findSubmitButton().should('be.enabled');
    configurePipelineServerModal.findSubmitButton().click();

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'dashboard-dspa-secret',
          namespace: 'test-project-name',
          annotations: {},
          labels: { 'opendatahub.io/dashboard': 'true' },
        },
        stringData: { AWS_ACCESS_KEY_ID: 'sdsd', AWS_SECRET_ACCESS_KEY: 'sdsd' },
      });
    });

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createSecret.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    toastNotifications
      .findToastNotification(0)
      .should(
        'have.text',
        'Info alert:Waiting on pipeline server resources for test-project-name...',
      );

    cy.wait('@createDSPA').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: { name: 'dspa', namespace: projectName },
        spec: {
          apiServer: { enableSamplePipeline: false },
          dspVersion: 'v2',
          objectStorage: {
            externalStorage: {
              host: 's3.amazonaws.com',
              scheme: 'https',
              bucket: 'sdsd',
              region: 'us-east-1',
              s3CredentialsSecret: {
                accessKey: 'AWS_ACCESS_KEY_ID',
                secretKey: 'AWS_SECRET_ACCESS_KEY',
                secretName: 'test-secret',
              },
            },
          },
        },
      });
    });

    toastNotifications.findToastNotification(0).should('contain.text', 'Success alert');
  });

  it('Configure pipeline server when viable connection does not exist', () => {
    initIntercepts({ isEmpty: true });
    pipelinesGlobal.visit(projectName);

    cy.interceptK8sList(
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
      },
      mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
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

    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
    pipelinesGlobal.findConfigurePipelineServerButton().click();
    configurePipelineServerModal.findAwsKeyInput().type('test-aws-key');
    configurePipelineServerModal.findAwsSecretKeyInput().type('test-secret-key');
    configurePipelineServerModal.findEndpointInput().type('https://s3.amazonaws.com');
    configurePipelineServerModal.findRegionInput().should('have.value', 'us-east-1');
    configurePipelineServerModal.findBucketInput().type('test-bucket');
    configurePipelineServerModal.findSubmitButton().should('be.enabled');
    configurePipelineServerModal.findSubmitButton().click();

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
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    cy.wait('@createDSPA').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: { name: 'dspa', namespace: 'test-project-name' },
        spec: {
          apiServer: { enableSamplePipeline: false },
          dspVersion: 'v2',
          objectStorage: {
            externalStorage: {
              host: 's3.amazonaws.com',
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
        },
      });
    });

    toastNotifications.findToastNotification(0).should('contain.text', 'Success alert');
  });

  it('Connect external database while configuring pipeline server', () => {
    initIntercepts({ isEmpty: true });
    pipelinesGlobal.visit(projectName);

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

    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
    pipelinesGlobal.findConfigurePipelineServerButton().click();

    configurePipelineServerModal.findAwsKeyInput().type('test-aws-key');
    configurePipelineServerModal.findAwsSecretKeyInput().type('test-secret-key');
    configurePipelineServerModal.findEndpointInput().type('https://s3.amazonaws.com');
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
          namespace: 'test-project-name',
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
              host: 's3.amazonaws.com',
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

  it('Delete pipeline server', () => {
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

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findInput().fill('Test Project pipeline server');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deletePipelineDBPassword');
    cy.wait('@deletePipelineConfig');
    cy.wait('@deleteDSPASecret');
    cy.wait('@deleteDSPA');
  });

  it('View pipeline server', () => {
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
    pipelinesGlobal.visit(projectName);

    pipelinesGlobal.selectPipelineServerAction('View pipeline server configuration');
    viewPipelineServerModal.shouldHaveAccessKey('sdsd');
    viewPipelineServerModal.findPasswordHiddenButton().click();
    viewPipelineServerModal.shouldHaveSecretKey('sdsd');
    viewPipelineServerModal.shouldHaveEndPoint('https://s3.amazonaws.com');
    viewPipelineServerModal.shouldHaveBucketName('test-pipelines-bucket');

    viewPipelineServerModal.findCloseButton().click();
  });

  it('renders the page with pipelines table data', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesTable.find();
    pipelinesTable.getRowById(initialMockPipeline.pipeline_id).find().should('exist');
  });

  describe('Table filtering and sorting', () => {
    it('Filter by pipeline name', () => {
      const mockPipelines: PipelineKF[] = [
        buildMockPipeline({
          display_name: 'Test pipeline 1',
          pipeline_id: 'test-pipeline-1',
        }),

        buildMockPipeline({
          display_name: 'Test pipeline 2',
          pipeline_id: 'test-pipeline-2',
        }),
      ];

      initIntercepts({ mockPipelines });
      pipelinesGlobal.visit(projectName);

      pipelinesTable.findRows().should('have.length', 2);

      pipelinesTable.selectFilterByName('Pipeline name');
      pipelinesTable.findFilterTextField().type('Test pipeline 1');

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) =>
          mockPipeline.display_name.includes('Test pipeline 1'),
        ),
        projectName,
      );

      pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');
      pipelinesTable.findRows().should('have.length', 1);
    });

    it('Filter by created after', () => {
      const mockPipelines = [
        buildMockPipeline({
          display_name: 'Test pipeline 1',
          pipeline_id: 'test-pipeline-1',
          created_at: '2023-01-30T22:55:17Z',
        }),

        buildMockPipeline({
          display_name: 'Test pipeline 2',
          pipeline_id: 'test-pipeline-2',
          created_at: '2024-01-30T22:55:17Z',
        }),
      ];

      initIntercepts({ mockPipelines });
      pipelinesGlobal.visit(projectName);

      pipelinesTable.findRows().should('have.length', 2);

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) => mockPipeline.created_at.includes('2024-01-30')),
        projectName,
      );

      pipelinesTable.selectFilterByName('Created after');
      pipelinesTable.findFilterTextField().type('2024-01-30');

      pipelinesTable.findRows().should('have.length', 1);
      pipelinesTable.getRowById(mockPipelines[1].pipeline_id).find().should('exist');
    });

    it('table with no result found', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      pipelinesTable.selectFilterByName('Pipeline name');
      pipelinesTable.findFilterTextField().type('abc');
      const mockPipelines = [initialMockPipeline];

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) => mockPipeline.display_name.includes('abc')),
        projectName,
      );

      pipelinesTable.findEmptyResults();
    });

    it('Table sort', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      pipelinesTable.shouldSortTable({
        sortType: PipelineSort.All,
        pipelines: [
          buildMockPipeline({
            display_name: 'Test pipeline 1',
            pipeline_id: 'test-pipeline-1',
            created_at: '2023-01-30T22:55:17Z',
          }),
          buildMockPipeline({
            display_name: 'Test pipeline 2',
            pipeline_id: 'test-pipeline-2',
            created_at: '2024-01-30T22:55:17Z',
          }),
        ],
        projectName,
      });
    });
  });

  it('incompatible dpsa version shows error', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([
        mockDataSciencePipelineApplicationK8sResource({ namespace: projectName, dspVersion: 'v1' }),
      ]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName, dspVersion: 'v1' }),
    );

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.isApiAvailable();
    pipelinesGlobal.findIsServerIncompatible().should('exist');
    pipelinesGlobal.shouldHaveIncompatibleTitleText();
  });

  it('error while creating a pipeline server', () => {
    initIntercepts({ initializing: true, errorMessage: 'Data connection unsuccessfully verified' });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal
      .findPipelineTimeoutErrorMessage()
      .should('have.text', 'Data connection unsuccessfully verified');
  });

  it('selects a different project', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    verifyRelativeURL('/pipelines/test-project-name');

    pipelineRunsGlobal.selectProjectByName('Test Project 2');
    verifyRelativeURL('/pipelines/test-project-name-2');
  });

  it('imports a new pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipeline(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [initialMockPipelineVersion],
      'new-pipeline',
      projectName,
    );

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName(initialMockPipeline.display_name);
    cy.findByTestId('duplicate-name-help-text').should('be.visible');
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipeline).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        uploadedMockPipeline.pipeline_id,
        initialMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineImportModal.submit();

    // Wait for pipeline upload
    cy.wait('@uploadPipeline').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        name: 'New pipeline',
        description: 'New pipeline description',
      });
    });

    cy.wait('@refreshPipelines');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/pipelines/${projectName}/${uploadedMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('fails to import a too-large file', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.findImportPipelineButton().click();

    pipelineImportModal.shouldBeOpen();
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName, 1);
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findUploadError().should('not.exist');
    pipelineImportModal.findSubmitButton().should('be.disabled');
    pipelineImportModal.uploadPipelineYaml(tooLargePipelineYAMLPath);
    pipelineImportModal.findUploadError().should('exist');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelineImportModal.findUploadError().should('not.exist');
    pipelineImportModal.findSubmitButton().should('be.enabled');
  });

  it('imports fails with Argo workflow', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(argoWorkflowPipeline);
    pipelineImportModal.submit();

    pipelineImportModal.findImportModalError().should('exist');
    pipelineImportModal.findImportModalError().contains('Unsupported pipeline version');
  });

  it('fails to import a v1 pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(v1PipelineYamlPath);
    pipelineImportModal.submit();

    pipelineImportModal.findImportModalError().should('exist');
    pipelineImportModal.findImportModalError().contains('Pipeline update and recompile required');
    argoAlert.findCloudServiceReleaseNotesLink().should('exist');
    argoAlert.findSelfManagedReleaseNotesLink().should('exist');
  });

  it('imports a new pipeline by url', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadPipelineAndVersionParams = {
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
    const createdMockPipeline = buildMockPipeline(uploadPipelineAndVersionParams.pipeline);
    const createdVersion = buildMockPipelineVersion(
      uploadPipelineAndVersionParams.pipeline_version,
    );

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal
      .mockCreatePipelineAndVersion(uploadPipelineAndVersionParams, projectName)
      .as('uploadPipelineAndVersion');
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName);
    pipelinesTable.mockGetPipelineVersions([createdVersion], 'new-pipeline', projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findImportPipelineRadio().check();
    pipelineImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, createdMockPipeline], projectName)
      .as('refreshPipelines');
    pipelineDetails.mockGetPipeline(projectName, createdMockPipeline).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(createdMockPipeline.pipeline_id, createdVersion, projectName)
      .as('getPipelineVersion');
    pipelineImportModal.submit();

    // Wait for pipeline upload
    cy.wait('@uploadPipelineAndVersion');
    cy.wait('@refreshPipelines');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/pipelines/${projectName}/${createdMockPipeline.pipeline_id}/${createdVersion.pipeline_version_id}/view`,
    );
  });

  it('uploads a new pipeline version', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadVersionParams = {
      display_name: 'New pipeline version',
      description: 'New pipeline version description',
      pipeline_id: 'test-pipeline',
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    const uploadedMockPipelineVersion = buildMockPipelineVersion(uploadVersionParams);

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.fillVersionDescription('New pipeline version description');
    pipelineVersionImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, uploadedMockPipelineVersion],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipelineVersion).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        initialMockPipeline.pipeline_id,
        uploadedMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@uploadVersion').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        name: 'New pipeline version',
        description: 'New pipeline version description',
        pipelineid: 'test-pipeline',
      });
    });

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.include({
        sort_by: 'created_at desc',
        pipeline_id: 'test-pipeline',
      });
    });

    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/pipelines/${projectName}/${initialMockPipeline.pipeline_id}/${uploadedMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('uploads fails with argo workflow', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('Argo workflow version');
    pipelineVersionImportModal.fillVersionDescription('Argo workflow version description');
    pipelineVersionImportModal.uploadPipelineYaml(argoWorkflowPipeline);
    pipelineVersionImportModal.submit();

    pipelineVersionImportModal.findImportModalError().should('exist');
    pipelineVersionImportModal.findImportModalError().contains('Unsupported pipeline version');
  });

  it('imports a new pipeline version by url', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const createPipelineVersionParams = {
      pipeline_id: 'test-pipeline',
      display_name: 'New pipeline version',
      description: 'New pipeline description',
      package_url: {
        pipeline_url: 'https://example.com/pipeline.yaml',
      },
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    const uploadedMockPipelineVersion = buildMockPipelineVersion(createPipelineVersionParams);

    // Intercept upload/re-fetch of pipeline versions
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, uploadedMockPipelineVersion],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');
    pipelineVersionImportModal
      .mockCreatePipelineVersion(createPipelineVersionParams, projectName)
      .as('createVersion');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipelineVersion).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        initialMockPipeline.pipeline_id,
        uploadedMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelinesTable.mockGetPipelineVersions(
      [initialMockPipelineVersion],
      initialMockPipeline.pipeline_id,
      projectName,
      2,
    );
    pipelineVersionImportModal.fillVersionName(initialMockPipelineVersion.display_name);
    cy.findByTestId('duplicate-name-help-text').should('be.visible');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.findImportPipelineRadio().check();
    pipelineVersionImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createVersion');
    cy.wait('@refreshVersions');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/pipelines/${projectName}/${initialMockPipeline.pipeline_id}/${uploadedMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('delete a single pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    createDeletePipelineIntercept(initialMockPipeline.pipeline_id).as('deletePipeline');
    pipelinesTable.mockGetPipelineVersions([], initialMockPipeline.pipeline_id, projectName);
    pipelinesGlobal.visit(projectName);

    // Check pipeline
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Delete pipeline')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipeline.display_name);
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines([]),
    ).as('refreshPipelines');

    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deletePipeline');

    cy.wait('@refreshPipelines').then(() => pipelinesTable.shouldBeEmpty());
  });

  it('delete a single pipeline version', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    createDeleteVersionIntercept(
      initialMockPipelineVersion.pipeline_id,
      initialMockPipelineVersion.pipeline_version_id,
    ).as('deleteVersion');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Check pipeline version
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Delete pipeline version')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipelineVersion.display_name);
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: initialMockPipeline.pipeline_id,
        },
      },
      buildMockPipelineVersions([]),
    ).as('refreshVersions');

    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');
    pipelineRow.findExpandButton().click();

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });
    pipelineRow.shouldNotHavePipelineVersion();
  });

  it('navigate to pipeline version details page', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();

    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionLink()
      .click();

    verifyRelativeURL(
      `/pipelines/${projectName}/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('navigates to pipeline version details page via pipeline name', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findPipelineNameLink(initialMockPipeline.display_name).click();

    verifyRelativeURL(
      `/pipelines/${projectName}/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('delete pipeline and versions', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    const mockPipeline1 = buildMockPipeline({
      display_name: 'Test pipeline 1',
      pipeline_id: 'test-pipeline-1',
    });
    const mockPipeline2 = buildMockPipeline({
      display_name: 'Test pipeline 2',
      pipeline_id: 'test-pipeline-2',
    });

    const mockPipeline1Version1 = buildMockPipelineVersion({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-1',
      display_name: `${mockPipeline1.display_name} version 1`,
    });

    const mockPipeline1Version2 = buildMockPipelineVersion({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-2',
      display_name: `${mockPipeline1.display_name} version 2`,
    });

    pipelinesTable.mockGetPipelines([mockPipeline1, mockPipeline2], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [mockPipeline1Version1, mockPipeline1Version2],
      mockPipeline1.pipeline_id,
      projectName,
    );
    pipelinesTable.mockGetPipelineVersions([], mockPipeline2.pipeline_id, projectName);

    pipelinesTable.mockDeletePipeline(mockPipeline2, projectName).as('deletePipeline');
    pipelinesTable
      .mockDeletePipelineVersion(mockPipeline1Version1, projectName)
      .as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline1 version 1 and pipeline 2
    const pipelineRow1 = pipelinesTable.getRowById(mockPipeline1.pipeline_id);
    pipelineRow1.findRowCheckbox().should('be.disabled');
    pipelineRow1.findExpandButton().click();
    pipelineRow1
      .getPipelineVersionRowById(mockPipeline1Version1.pipeline_version_id)
      .findRowCheckbox()
      .check();

    const pipelineRow2 = pipelinesTable.getRowById(mockPipeline2.pipeline_id);
    pipelineRow2.findRowCheckbox().should('be.enabled').check();

    //Delete the selected pipeline and versions
    pipelinesGlobal.findDeleteButton().click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type('Delete 1 pipeline and 1 version');

    pipelinesTable.mockGetPipelines([mockPipeline1], projectName).as('refreshPipelines');
    pipelinesTable
      .mockGetPipelineVersions([], mockPipeline1.pipeline_id, projectName)
      .as('refreshVersions');
    deleteModal.findSubmitButton().click();

    // Wait for deletion
    cy.wait('@deletePipeline');
    cy.wait('@deleteVersion');

    cy.wait('@refreshPipelines');
    cy.wait('@refreshVersions').then(() => {
      // Test deleted
      pipelinesTable.shouldRowNotBeVisible(mockPipeline2.display_name);
      pipelinesTable.getRowById(mockPipeline1.pipeline_id).findExpandButton().click();
      pipelinesTable.shouldRowNotBeVisible(mockPipeline1Version1.display_name);
    });
  });

  it('navigate to create run page from pipeline row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create run')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/runs/create`);
  });

  it('run and schedule dropdown action should be disabled when pipeline and pipeline version is not supported', () => {
    const mockPipelines: PipelineKF[] = [
      buildMockPipeline({
        display_name: 'Argo workflow',
        pipeline_id: 'argo-workflow',
      }),
    ];

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: 'argo-workflow',
        },
      },
      initialMockPipeline,
    );

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: 'argo-workflow',
        },
      },
      buildMockPipelineVersions([mockArgoWorkflowPipelineVersion({ pipelineId: 'argo-workflow' })]),
    );

    initIntercepts({ mockPipelines });
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById('argo-workflow');
    pipelineRow.findKebabAction('Create run').should('have.attr', 'aria-disabled');
    pipelineRow.findKebabAction('Create schedule').should('have.attr', 'aria-disabled');

    pipelineRow.findExpandButton().click();

    const pipelineVersionRow = pipelineRow.getPipelineVersionRowById('test-pipeline-version');
    pipelineVersionRow.findKebabAction('Create run').should('have.attr', 'aria-disabled');
    pipelineVersionRow.findKebabAction('Create schedule').should('have.attr', 'aria-disabled');
  });

  it('run and schedule dropdown action should be disabeld when pipeline has no versions', () => {
    initIntercepts({ hasNoPipelineVersions: true });
    pipelinesGlobal.visit(projectName);

    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create schedule')
      .should('have.attr', 'aria-disabled');
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create run')
      .should('have.attr', 'aria-disabled');
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create schedule')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/schedules/create`);
  });

  it('navigate to create run page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Create run')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/runs/create`);
  });

  it('navigates to "Schedule run" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Create schedule')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/schedules/create`);
  });

  it('navigate to view runs page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionViewRunLink()
      .click();

    verifyRelativeURL(
      `/pipelineRuns/${projectName}/runs/active?pipeline_version=${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('navigates to "Schedules" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('View schedules')
      .click();

    verifyRelativeURL(
      `/pipelineRuns/${projectName}/schedules?pipeline_version=${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('Table pagination', () => {
    const mockPipelines = Array.from({ length: 25 }, (_, i) =>
      buildMockPipeline({
        display_name: `Test pipeline-${i}`,
      }),
    );
    initIntercepts({
      mockPipelines: mockPipelines.slice(0, 10),
      totalSize: 25,
      nextPageToken: 'page-2-token',
    });
    pipelinesGlobal.visit(projectName);

    cy.wait('@getPipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
      });
    });

    pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '10');

    const pagination = tablePagination.top;

    // test Next button
    pagination.findPreviousButton().should('be.disabled');
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(10, 20), 25),
    ).as('refreshPipelines');

    pagination.findNextButton().click();

    cy.wait('@refreshPipelines').then((interception) => {
      expect(interception.request.query).to.include({
        sort_by: 'created_at desc',
        page_token: 'page-2-token',
      });
    });

    pipelinesTable.getRowById(mockPipelines[10].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '10');

    // test Previous button
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(0, 10), 25),
    ).as('getFirstTenPipelines');

    pagination.findPreviousButton().click();

    cy.wait('@getFirstTenPipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
      });
    });

    pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');

    // 20 per page
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(0, 20), 22),
    );
    pagination.selectToggleOption('20 per page');
    pagination.findPreviousButton().should('be.disabled');
    pipelinesTable.getRowById(mockPipelines[19].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '20');
  });
});

type HandlersProps = {
  isEmpty?: boolean;
  mockPipelines?: PipelineKF[];
  mockPipelineVersions?: PipelineVersionKF[];
  hasNoPipelineVersions?: boolean;
  totalSize?: number;
  errorMessage?: string;
  initializing?: boolean;
  nextPageToken?: string | undefined;
};

const initIntercepts = ({
  isEmpty = false,
  mockPipelines = [initialMockPipeline],
  mockPipelineVersions = [initialMockPipelineVersion],
  hasNoPipelineVersions = false,
  initializing,
  errorMessage,
  totalSize = mockPipelines.length,
  nextPageToken,
}: HandlersProps): void => {
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockDataSciencePipelineApplicationK8sResource({
              namespace: projectName,
            }),
          ],
    ),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      dspaSecretName: 'aws-connection-test',
      initializing,
      message: errorMessage,
    }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines(mockPipelines, totalSize, nextPageToken),
  ).as('getPipelines');

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    hasNoPipelineVersions ? {} : buildMockPipelineVersions(mockPipelineVersions),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    initialMockPipeline,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
        pipelineVersionId: initialMockPipelineVersion.pipeline_version_id,
      },
    },
    initialMockPipelineVersion,
  );
};

const createDeleteVersionIntercept = (pipelineId: string, pipelineVersionId: string) =>
  cy.interceptOdh(
    'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: { namespace: projectName, serviceName: 'dspa', pipelineId, pipelineVersionId },
      times: 1,
    },
    mockSuccessGoogleRpcStatus({}),
  );

const createDeletePipelineIntercept = (pipelineId: string) =>
  cy.interceptOdh(
    'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: { namespace: projectName, serviceName: 'dspa', pipelineId },
      times: 1,
    },
    mockSuccessGoogleRpcStatus({}),
  );
