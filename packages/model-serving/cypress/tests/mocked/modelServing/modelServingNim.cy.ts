import {
  mockNimInferenceService,
  mockNimServingRuntime,
} from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import {
  initInterceptsToDeployNimInWizard,
  initInterceptsToEnableNim,
} from '@odh-dashboard/cypress/cypress/utils/legacyNimUtils';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/cypress/cypress/utils/modelServingConstants';

describe('NIM Models Deployments', () => {
  it('should be listed in the global models list', () => {
    initInterceptsToEnableNim();
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');

    // Table is visible and has 1 row
    modelServingSection.findDeploymentsTable().should('have.length', 1);

    // First row matches the NIM inference service details
    modelServingSection
      .getDeploymentRow('Test Name')
      .findProject()
      .should('contains.text', 'Test Project');
    modelServingSection
      .getDeploymentRow('Test Name')
      .findProject()
      .should('contains.text', 'NVIDIA NIM serving enabled');
    modelServingSection
      .getDeploymentRow('Test Name')
      .findServingRuntime()
      .should('have.text', 'NVIDIA NIM');
    modelServingSection.getDeploymentRow('Test Name').findAPIProtocol().should('have.text', 'REST');
  });

  it('should be allowed to be deleted and edit', () => {
    initInterceptsToEnableNim();
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Name').findKebabAction('Edit').should('exist');
    modelServingGlobal.getModelRow('Test Name').findKebabAction('Delete').should('exist');
  });

  it('should deploy a NIM model through the wizard', () => {
    initInterceptsToEnableNim({ nimWizard: true });
    initInterceptsToDeployNimInWizard();
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard
      .findModelLocationSelectOption(ModelLocationSelectOption.NIM)
      .should('exist')
      .click();
    modelServingWizard.nim.selectImage('Snowflake Arctic Embed Large Embedding - 1.0.1');
    // NIM forces the model type - it cannot be changed
    modelServingWizard.findModelTypeSelect().should('contain.text', ModelTypeLabel.NIM);
    modelServingWizard.findModelTypeSelect().should('be.disabled');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    // only one profile is available, so the selector is pre-filled and disabled
    modelServingWizard.selectPotentiallyDisabledProfile('default-profile');
    // NIM is always deployed as a legacy KServe model with no model format selection
    modelServingWizard.findModelFormatSelect().should('not.exist');
    modelServingWizard.findNumReplicasPlusButton().click();
    modelServingWizard.findNumReplicasInputField().should('have.value', '2');

    // PVC caching (not yet wired into the created resources)
    modelServingWizard.nim.findPVCNameInput().type('nim-pvc');
    modelServingWizard.nim.findSubPathInput().type('arctic-embed-l');
    modelServingWizard.nim
      .findStorageClassSelect()
      .findSelectOption('openshift-default-sc')
      .click();
    modelServingWizard.nim.findStorageSizeInput().clear().type('75');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body.metadata).to.containSubset({
        name: 'test-model',
        namespace: 'test-project',
        labels: {
          'opendatahub.io/dashboard': 'true',
          'networking.kserve.io/visibility': 'exposed',
        },
        annotations: {
          'openshift.io/display-name': 'test-model',
          'security.opendatahub.io/enable-auth': 'true',
          'opendatahub.io/hardware-profile-name': 'default-profile',
          'opendatahub.io/hardware-profile-namespace': 'opendatahub',
        },
      });
      // NIM has no connection - the model comes from the NIM registry, not a connection
      expect(interception.request.body.metadata.annotations).to.not.have.property(
        'opendatahub.io/connections',
      );
      expect(interception.request.body.spec.predictor).to.containSubset({
        minReplicas: 2,
        maxReplicas: 2,
        model: {
          runtime: 'test-model',
          modelFormat: { name: 'arctic-embed-l' },
          resources: {
            requests: { cpu: '2', memory: '4Gi' },
            limits: { cpu: '2', memory: '4Gi' },
          },
        },
      });
      expect(interception.request.body.spec.predictor.model).to.not.have.property('storage');
    });

    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body.metadata).to.containSubset({
        name: 'test-model',
        namespace: 'test-project',
        annotations: {
          'opendatahub.io/template-name': 'odh-nim-account-template',
          'opendatahub.io/template-display-name': 'NVIDIA NIM',
        },
      });
      expect(interception.request.body.spec).to.containSubset({
        supportedModelFormats: [
          { name: 'arctic-embed-l', version: '1.0.1', autoSelect: false, priority: 1 },
        ],
        // NIM mounts a shared memory volume for the runtime
        volumes: [{ name: 'shm', emptyDir: { medium: 'Memory', sizeLimit: '2Gi' } }],
      });
      const kserveContainer = interception.request.body.spec.containers.find(
        (container: { name: string }) => container.name === 'kserve-container',
      );
      expect(kserveContainer).to.containSubset({
        image: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
        volumeMounts: [{ name: 'shm', mountPath: '/dev/shm' }],
      });
      // resources are sized by the InferenceService hardware profile, not the runtime container
      interception.request.body.spec.containers.forEach((container: { resources?: unknown }) => {
        expect(container).to.not.have.property('resources');
      });
    });

    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    // Token authentication - the service account, its view role/binding and the token secret
    cy.wait('@createServiceAccount').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'test-model-sa',
        namespace: 'test-project',
      });
    });

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'test-model-view-role',
        namespace: 'test-project',
      });
      expect(interception.request.body.rules).to.containSubset([
        {
          verbs: ['get'],
          apiGroups: ['serving.kserve.io'],
          resources: ['inferenceservices'],
          resourceNames: ['test-model'],
        },
      ]);
    });

    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'test-model-view',
        namespace: 'test-project',
      });
      expect(interception.request.body.roleRef).to.containSubset({
        kind: 'Role',
        name: 'test-model-view-role',
      });
      expect(interception.request.body.subjects).to.containSubset([
        { kind: 'ServiceAccount', name: 'test-model-sa' },
      ]);
    });

    cy.wait('@createServiceAccountSecret').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'default-token-test-model-sa',
        namespace: 'test-project',
        annotations: {
          'kubernetes.io/service-account.name': 'test-model-sa',
          'openshift.io/display-name': 'default-token',
        },
      });
      expect(interception.request.body.type).to.equal('kubernetes.io/service-account-token');
    });
  });
});
