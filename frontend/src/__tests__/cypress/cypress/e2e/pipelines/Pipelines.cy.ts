/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
  pipelineDeleteModal,
  configurePipelineServerModal,
  viewPipelineServerModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import { be } from '~/__tests__/cypress/cypress/utils/should';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const pipelineYamlPath = './cypress/e2e/pipelines/mock-upload-pipeline.yaml';

describe('Pipelines', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.findEmptyState().should('exist');
    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
  });

  it('Configure pipeline server when data connection exist', () => {
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
    pipelinesGlobal.findConfigurePipelineServerButton().should('be.enabled');
    pipelinesGlobal.findConfigurePipelineServerButton().click();
    configurePipelineServerModal.selectDataConnection('Test Secret •••••••••••••••••');
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

    cy.wait('@createDSPA').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: { name: 'dspa', namespace: projectName },
        spec: {
          apiServer: { enableSamplePipeline: false },
          dspVersion: 'v2',
          objectStorage: {
            externalStorage: {
              host: 's3.us-east-1.amazonaws.com',
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
  });

  it('Configure pipeline server when data connection does not exist', () => {
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
    configurePipelineServerModal.findEndpointInput().type('https://s3.amazonaws.com/');
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
        },
      });
    });
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
    viewPipelineServerModal.findCloseButton().click();

    pipelinesGlobal.selectPipelineServerAction('View pipeline server configuration');
    viewPipelineServerModal.shouldHaveAccessKey('sdsd');
    viewPipelineServerModal.findPasswordHiddenButton().click();
    viewPipelineServerModal.shouldHaveSecretKey('sdsd');
    viewPipelineServerModal.shouldHaveEndPoint('https://s3.amazonaws.com');
    viewPipelineServerModal.shouldHaveBucketName('test-pipelines-bucket');

    viewPipelineServerModal.findDoneButton().click();
  });

  it('renders the page with pipelines table data', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesTable.find();
    pipelinesTable.getRowByName('Test pipeline').find().should('exist');
  });

  describe('Table filtering and sorting', () => {
    it('Filter by pipeline name', () => {
      const mockPipelines: PipelineKFv2[] = [
        buildMockPipelineV2({
          display_name: 'Test pipeline 1',
          pipeline_id: 'test-pipeline-1',
        }),

        buildMockPipelineV2({
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
        mockPipelines.filter((mockpipeline) =>
          mockpipeline.display_name.includes('Test pipeline 1'),
        ),
        projectName,
      );

      pipelinesTable.getRowByName('Test pipeline 1').find().should('exist');
      pipelinesTable.findRows().should('have.length', 1);
    });

    it('Filter by created after', () => {
      const mockPipelines = [
        buildMockPipelineV2({
          display_name: 'Test pipeline 1',
          pipeline_id: 'test-pipeline-1',
          created_at: '2023-01-30T22:55:17Z',
        }),

        buildMockPipelineV2({
          display_name: 'Test pipeline 2',
          pipeline_id: 'test-pipeline-2',
          created_at: '2024-01-30T22:55:17Z',
        }),
      ];

      initIntercepts({ mockPipelines });
      pipelinesGlobal.visit(projectName);

      pipelinesTable.findRows().should('have.length', 2);

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockpipeline) => mockpipeline.created_at.includes('2024-01-30')),
        projectName,
      );

      pipelinesTable.selectFilterByName('Created after');
      pipelinesTable.findFilterTextField().type('2024-01-30');

      pipelinesTable.findRows().should('have.length', 1);
      pipelinesTable.getRowByName('Test pipeline 2').find().should('exist');
    });

    it('table with no result found', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      pipelinesTable.selectFilterByName('Pipeline name');
      pipelinesTable.findFilterTextField().type('abc');
      const mockPipeline = [initialMockPipeline];

      pipelinesTable.mockGetPipelines(
        mockPipeline.filter((mockpipeline) => mockpipeline.display_name.includes('abc')),
        projectName,
      );

      pipelinesTable.findEmptyResults();
    });

    it('Table sort', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      // by Pipeline
      pipelinesTable.findTableHeaderButton('Pipeline').click();
      pipelinesTable.findTableHeaderButton('Pipeline').should(be.sortAscending);
      pipelinesTable.findTableHeaderButton('Pipeline').click();
      pipelinesTable.findTableHeaderButton('Pipeline').should(be.sortDescending);

      // by Created
      pipelinesTable.findTableHeaderButton('Created').click();
      pipelinesTable.findTableHeaderButton('Created').should(be.sortAscending);
      pipelinesTable.findTableHeaderButton('Created').click();
      pipelinesTable.findTableHeaderButton('Created').should(be.sortDescending);
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
    pipelinesGlobal.findDeletePipelineServerButton().should('not.exist');
  });

  it('incompatible dpsa version shows error with delete option for admins', () => {
    asProductAdminUser();
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
    pipelinesGlobal.findDeletePipelineServerButton().should('exist');
  });

  it('selects a different project', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    verifyRelativeURL('/pipelines/test-project-name');

    pipelinesGlobal.selectProjectByName('Test Project 2');
    verifyRelativeURL('/pipelines/test-project-name-2');
  });

  it('imports a new pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipelineV2(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelineImportModal.submit();

    // Wait for upload/fetch requests
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

    cy.wait('@refreshPipelines').then((interception) => {
      expect(interception.request.query).to.eql({ sort_by: 'created_at desc', page_size: '10' });
    });

    // Verify the uploaded pipeline is in the table
    pipelinesTable.getRowByName('New pipeline').find().should('exist');
  });

  it('imports a new pipeline by url', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
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
    const createdMockPipeline = buildMockPipelineV2(createPipelineAndVersionParams.pipeline);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal
      .mockCreatePipelineAndVersion(createPipelineAndVersionParams, projectName)
      .as('createPipelineAndVersion');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, createdMockPipeline], projectName)
      .as('refreshPipelines');
    pipelinesTable.mockGetPipelineVersions(
      [buildMockPipelineVersionV2(createPipelineAndVersionParams.pipeline_version)],
      'new-pipeline',
      projectName,
    );

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findImportPipelineRadio().check();
    pipelineImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createPipelineAndVersion');
    cy.wait('@refreshPipelines');

    // Verify the uploaded pipeline is in the table
    pipelinesTable.getRowByName('New pipeline').find().should('exist');
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

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersionV2(uploadVersionParams)],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.fillVersionDescription('New pipeline version description');
    pipelineVersionImportModal.uploadPipelineYaml(pipelineYamlPath);
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
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.getRowByName('Test pipeline').toggleExpandByIndex(0);
    pipelinesTable.getRowByName('New pipeline version').find().should('exist');
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

    // Intercept upload/re-fetch of pipeline versions
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersionV2(createPipelineVersionParams)],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');

    pipelineVersionImportModal
      .mockCreatePipelineVersion(createPipelineVersionParams, projectName)
      .as('createVersion');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.findImportPipelineRadio().check();
    pipelineVersionImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createVersion');
    cy.wait('@refreshVersions');

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.getRowByName('Test pipeline').toggleExpandByIndex(0);
    pipelinesTable.getRowByName('New pipeline version').find().should('exist');
  });

  it('delete a single pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    createDeletePipelineIntercept(initialMockPipeline.pipeline_id).as('deletePipeline');
    pipelinesTable.mockGetPipelineVersions([], initialMockPipeline.pipeline_id, projectName);
    pipelinesGlobal.visit(projectName);

    // Check pipeline
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Delete pipeline')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipeline.display_name);
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
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
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Delete pipeline version')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipelineVersion.display_name);
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
      },
      buildMockPipelineVersionsV2([]),
    ).as('refreshVersions');
    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });
    pipelinesTable.getRowByName(initialMockPipeline.display_name).shouldNotHavePipelineVersion();
  });

  it('navigate to pipeline version details page', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findPipelineName(initialMockPipelineVersion.display_name)
      .click();
    verifyRelativeURL(
      `/pipelines/${projectName}/pipeline/view/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('delete pipeline and versions', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    const mockPipeline1 = buildMockPipelineV2({
      display_name: 'Test pipeline 1',
      pipeline_id: 'test-pipeline-1',
    });
    const mockPipeline2 = buildMockPipelineV2({
      display_name: 'Test pipeline 2',
      pipeline_id: 'test-pipeline-2',
    });

    const mockPipeline1Version1 = buildMockPipelineVersionV2({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-1',
      display_name: `${mockPipeline1.display_name} version 1`,
    });

    pipelinesTable.mockGetPipelines([mockPipeline1, mockPipeline2], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [mockPipeline1Version1],
      mockPipeline1.pipeline_id,
      projectName,
    );
    pipelinesTable.mockGetPipelineVersions([], mockPipeline2.pipeline_id, projectName);

    pipelinesTable.mockDeletePipeline(mockPipeline2, projectName).as('deletePipeline');
    pipelinesTable
      .mockDeletePipelineVersion(mockPipeline1Version1, projectName)
      .as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline1 and one version in pipeline 2
    pipelinesTable.getRowByName(mockPipeline1.display_name).toggleExpandByIndex(0);
    pipelinesTable.getRowByName(mockPipeline2.display_name).toggleExpandByIndex(1);

    pipelinesTable.getRowByName(mockPipeline2.display_name).toggleCheckboxByRowName();
    pipelinesTable.getRowByName(mockPipeline1Version1.display_name).toggleCheckboxByRowName();

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
      const pipelineTableRow = pipelinesTable.getRowByName(mockPipeline1.display_name);
      pipelineTableRow.toggleExpandByIndex(0);
      pipelinesTable.shouldRowNotBeVisible(mockPipeline1Version1.display_name);
    });
  });

  it('navigate to create run page from pipeline row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

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
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Schedule run')
      .click();

    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create?runType=scheduled`);
  });

  it('navigate to create run page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Create run')
      .click();
    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create`);
  });

  it('navigates to "Schedule run" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Schedule run')
      .click();

    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create?runType=scheduled`);
  });

  it('navigate to view runs page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('View runs')
      .click();
    verifyRelativeURL(`/pipelineRuns/${projectName}?runType=active`);
  });

  it('navigates to "Schedules" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('View schedules')
      .click();
    verifyRelativeURL(`/pipelineRuns/${projectName}?runType=scheduled`);
  });
});

type HandlersProps = {
  isEmpty?: boolean;
  mockPipelines?: PipelineKFv2[];
};

const initIntercepts = ({
  isEmpty = false,
  mockPipelines = [initialMockPipeline],
}: HandlersProps) => {
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList(
      isEmpty ? [] : [mockDataSciencePipelineApplicationK8sResource({ namespace: projectName })],
    ),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      dspaSecretName: 'aws-connection-test',
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

  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
    },
    buildMockPipelines(mockPipelines),
  );

  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
    },
    buildMockPipelineVersionsV2([initialMockPipelineVersion]),
  );
};

const createDeleteVersionIntercept = (pipelineId: string, pipelineVersionId: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${pipelineId}/versions/${pipelineVersionId}`,
      method: 'DELETE',
      times: 1,
    },
    {
      body: {},
    },
  );

const createDeletePipelineIntercept = (pipelineId: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${pipelineId}`,
      method: 'DELETE',
      times: 1,
    },
    {
      body: {},
    },
  );
