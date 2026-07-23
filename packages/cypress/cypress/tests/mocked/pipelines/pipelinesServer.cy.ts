/* eslint-disable camelcase */
import {
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockSecretK8sResource,
  mockDashboardConfig,
} from '@odh-dashboard/internal/__mocks__';
import { DSPipelineAPIServerStore } from '@odh-dashboard/internal/k8sTypes.ts';
import { projectName, initIntercepts } from './pipelinesTestUtils';
import {
  pipelinesGlobal,
  configurePipelineServerModal,
  managePipelineServerModal,
} from '../../../pages/pipelines';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { DataSciencePipelineApplicationModel, SecretModel } from '../../../utils/models';
import { toastNotifications } from '../../../pages/components/ToastNotifications';

describe('Pipeline Server', () => {
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

    configurePipelineServerModal.findAdvancedSettingsButton().click();
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

  it('Configure pipeline server with store pipeline yaml in kubernetes option', () => {
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

    // Fill out basic required fields
    configurePipelineServerModal.findAwsKeyInput().type('test-aws-key');
    configurePipelineServerModal.findAwsSecretKeyInput().type('test-secret-key');
    configurePipelineServerModal.findEndpointInput().type('https://s3.amazonaws.com');
    configurePipelineServerModal.findRegionInput().should('have.value', 'us-east-1');
    configurePipelineServerModal.findBucketInput().type('test-bucket');

    // Find and ensure the store pipeline yaml in kubernetes checkbox is checked
    configurePipelineServerModal.findAdvancedSettingsButton().click();
    configurePipelineServerModal.findPipelineStoreCheckbox().should('be.checked');

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
        metadata: { name: 'dspa', namespace: projectName },
        spec: {
          apiServer: {
            enableSamplePipeline: false,
            pipelineStore: DSPipelineAPIServerStore.KUBERNETES,
          },
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

    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');
    managePipelineServerModal.shouldHaveAccessKey('sdsd');
    managePipelineServerModal.findPasswordHiddenButton().click();
    managePipelineServerModal.shouldHaveSecretKey('sdsd');
    managePipelineServerModal.shouldHaveEndPoint('https://s3.amazonaws.com');
    managePipelineServerModal.shouldHaveBucketName('test-pipelines-bucket');

    managePipelineServerModal
      .findPipelineStoreCheckbox()
      .should('be.disabled')
      .should('not.be.checked');

    managePipelineServerModal.checkButtonState('save', false);
    managePipelineServerModal.checkButtonState('cancel', true);

    const checkbox = managePipelineServerModal.getPipelineCachingCheckbox();
    checkbox.should('be.checked');
    checkbox.click();
    checkbox.should('not.be.checked');
    managePipelineServerModal.checkButtonState('save', true);
    managePipelineServerModal.checkButtonState('cancel', true);

    managePipelineServerModal.findCloseButton().click();
  });

  it('should toggle managed pipelines in manage server modal', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ automl: true, autorag: true }));
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
    cy.interceptK8s(
      'PATCH',
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'dspa',
      },
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ).as('patchDSPA');

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');

    const managedPipelinesCheckbox = managePipelineServerModal.getManagedPipelinesCheckbox();
    managedPipelinesCheckbox.should('exist').should('not.be.checked');

    managePipelineServerModal.checkButtonState('save', false);

    // Toggle managed pipelines on
    managedPipelinesCheckbox.click();
    managedPipelinesCheckbox.should('be.checked');
    managePipelineServerModal.checkButtonState('save', true);

    // Click save
    managePipelineServerModal.findSubmitButton().click();

    cy.wait('@patchDSPA').then((interception) => {
      expect(interception.request.body).to.have.length(1);
      const managedPipelinesPatch = interception.request.body.find(
        (patch: { path: string }) => patch.path === '/spec/apiServer/managedPipelines',
      );
      expect(managedPipelinesPatch?.op).to.equal('add');
      expect(managedPipelinesPatch?.value).to.deep.equal({});
    });

    toastNotifications.findToastNotification(0).should('contain.text', 'Success alert');
  });

  it('should persist managed pipelines state after save', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ automl: true, autorag: true }));
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
        managedPipelines: {},
      }),
    );
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
    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');

    // Managed pipelines should be checked
    const managedPipelinesCheckbox = managePipelineServerModal.getManagedPipelinesCheckbox();
    managedPipelinesCheckbox.should('be.checked');

    managePipelineServerModal.findCloseButton().click();

    // Reopen modal
    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');

    // Should still be checked
    managePipelineServerModal.getManagedPipelinesCheckbox().should('be.checked');
  });

  it('should update both caching and managed pipelines together', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ automl: true, autorag: true }));
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
    cy.interceptK8s(
      'PATCH',
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'dspa',
      },
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ).as('patchDSPA');

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');

    // Disable caching
    managePipelineServerModal.getPipelineCachingCheckbox().should('be.checked');
    managePipelineServerModal.getPipelineCachingCheckbox().click();
    managePipelineServerModal.getPipelineCachingCheckbox().should('not.be.checked');

    // Enable managed pipelines
    managePipelineServerModal.getManagedPipelinesCheckbox().should('not.be.checked');
    managePipelineServerModal.getManagedPipelinesCheckbox().click();
    managePipelineServerModal.getManagedPipelinesCheckbox().should('be.checked');

    managePipelineServerModal.checkButtonState('save', true);

    // Click save
    managePipelineServerModal.findSubmitButton().click();

    cy.wait('@patchDSPA').then((interception) => {
      expect(interception.request.body).to.have.length(2);

      // Should contain both patches
      const paths = interception.request.body.map((patch: { path: string }) => patch.path);
      expect(paths).to.include('/spec/apiServer/cacheEnabled');
      expect(paths).to.include('/spec/apiServer/managedPipelines');

      // Verify cacheEnabled is false
      const cachePatch = interception.request.body.find(
        (patch: { path: string }) => patch.path === '/spec/apiServer/cacheEnabled',
      );
      expect(cachePatch.value).to.equal(false);

      // Verify managedPipelines is empty object
      const managedPipelinesPatch = interception.request.body.find(
        (patch: { path: string }) => patch.path === '/spec/apiServer/managedPipelines',
      );
      expect(managedPipelinesPatch.value).to.deep.equal({});
    });

    toastNotifications.findToastNotification(0).should('contain.text', 'Success alert');
  });

  it('should disable managed pipelines when toggled off', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ automl: true, autorag: true }));
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
        managedPipelines: {},
      }),
    );
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
    cy.interceptK8s(
      'PATCH',
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'dspa',
      },
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ).as('patchDSPA');

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');

    const managedPipelinesCheckbox = managePipelineServerModal.getManagedPipelinesCheckbox();
    managedPipelinesCheckbox.should('be.checked');

    // Toggle off
    managedPipelinesCheckbox.click();
    managedPipelinesCheckbox.should('not.be.checked');

    managePipelineServerModal.checkButtonState('save', true);

    // Click save
    managePipelineServerModal.findSubmitButton().click();

    cy.wait('@patchDSPA').then((interception) => {
      expect(interception.request.body).to.have.length(1);
      const managedPipelinesPatch = interception.request.body.find(
        (patch: { path: string }) => patch.path === '/spec/apiServer/managedPipelines',
      );
      // Should be undefined when disabled
      expect(managedPipelinesPatch?.value).to.equal(undefined);
    });

    toastNotifications.findToastNotification(0).should('contain.text', 'Success alert');
  });

  it('should validate delete confirmation text and allow cancel', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
    deleteModal.shouldBeOpen();

    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().type('wrong text');
    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().clear();
    deleteModal.findInput().type('Test Project pipeline server');
    deleteModal.findSubmitButton().should('be.enabled');

    deleteModal.findCancelButton().click();
    deleteModal.shouldBeOpen(false);
  });

  describe('Pipeline server deletion flow', () => {
    it('should update UI to show empty state after successful deletion', () => {
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
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type('Test Project pipeline server');
      deleteModal.findSubmitButton().click();

      cy.wait('@deleteDSPA');
      initIntercepts({ isEmpty: true });
      pipelinesGlobal.visit(projectName);
      pipelinesGlobal.findEmptyState().should('exist');
    });
  });

  describe('Manage then delete pipeline server', () => {
    it('should be able to view and then delete pipeline server', () => {
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

      pipelinesGlobal.selectPipelineServerAction('Manage pipeline server configuration');
      managePipelineServerModal.shouldBeOpen();
      managePipelineServerModal.shouldHaveAccessKey('sdsd');
      managePipelineServerModal.findCloseButton().click();

      cy.interceptK8s(
        'DELETE',
        DataSciencePipelineApplicationModel,
        mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
      ).as('deleteDSPA');

      pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type('Test Project pipeline server');
      deleteModal.findSubmitButton().click();

      cy.wait('@deleteDSPA');
    });
  });

  it('should show delete option when server is initializing or has error', () => {
    initIntercepts({ initializing: true });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
    deleteModal.shouldBeOpen();
    deleteModal.findCancelButton().click();

    initIntercepts({ initializing: false, errorMessage: 'Failed to connect to storage' });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.selectPipelineServerAction('Delete pipeline server');
    deleteModal.shouldBeOpen();
  });

  it('error while creating a pipeline server', () => {
    initIntercepts({ initializing: true, errorMessage: 'Data connection unsuccessfully verified' });
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal
      .findPipelineTimeoutErrorMessage()
      .should('have.text', 'Data connection unsuccessfully verified');
  });
});
