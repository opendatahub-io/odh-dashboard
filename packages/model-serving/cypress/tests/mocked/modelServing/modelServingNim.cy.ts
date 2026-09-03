import {
  mockNimInferenceService,
  mockNimServingRuntime,
} from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import type { Volume } from '@odh-dashboard/k8s-core';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockCustomSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import {
  initInterceptsToDeployNimInWizard,
  initInterceptsToEnableNim,
} from '@odh-dashboard/cypress/cypress/utils/legacyNimUtils';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';
import {
  InferenceServiceModel,
  PVCModel,
  ServingRuntimeModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
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

  it('should show the NIM deployment details in the expanded row on the project Models tab', () => {
    initInterceptsToEnableNim({ nimWizard: true });
    cy.interceptK8sList(
      InferenceServiceModel,
      // Carry the hardware profile annotations so the expanded row resolves the saved profile
      mockK8sResourceList([
        mockNimInferenceService({
          hardwareProfileName: 'default-profile',
          hardwareProfileNamespace: 'opendatahub',
          hardwareProfileResourceVersion: '1309350',
        }),
      ]),
    );
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));
    // Auth is enabled by default on the NIM deployment (no enable-auth=false annotation), so the
    // token table reads the deployment's service-account token secret ("<deployment-name>-sa").
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          name: 'default-name2-test-name-sa',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'default-name2',
            'kubernetes.io/service-account.name': 'test-name-sa',
          },
          type: 'kubernetes.io/service-account-token',
          // Decodes to 48 chars so the masked value renders the full 40-bullet cap
          data: { token: btoa('x'.repeat(48)) },
        }),
      ]),
    );

    modelServingSection.visit('test-project');

    const row = modelServingSection.getKServeRow('Test Name');
    row.findToggleButton().click();

    row.findDescriptionListItem('Framework').next('dd').should('have.text', 'arctic-embed-l');
    row.findDescriptionListItem('Model server replicas').next('dd').should('have.text', '1');
    row
      .findDescriptionListItem('Model server size')
      .next('dd')
      .should('contain.text', '2 CPUs, 6GiB Memory requested');
    row
      .findDescriptionListItem('Model server size')
      .next('dd')
      .should('contain.text', '4 CPUs, 8GiB Memory limit');
    row
      .findDescriptionListItem('Hardware profile')
      .next('dd')
      .should('have.text', 'default-profile');
    row
      .findDescriptionListItem('Model availability')
      .next('dd')
      .should('have.text', 'No model availability');
    row
      .findDescriptionListItem('Token authentication')
      .next('dd')
      .should('contain.text', 'default-name2');
    row
      .findDescriptionListItem('Token authentication')
      .next('dd')
      .findByTestId('token-secret')
      .should('contain.text', '•'.repeat(40));
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

    // PVC caching storage
    modelServingWizard.nim.findPVCNameInput().type('pr pvc test');
    modelServingWizard.nim.findSubPathInput().type('arctic-embed-l');
    modelServingWizard.nim
      .findStorageClassSelect()
      .findSelectOption('openshift-default-sc')
      .click();
    modelServingWizard.nim.setStorageSizeGi(75);
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // PVC creation — dry-run validates the PVC can be created
    cy.wait('@createPVC').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body.metadata).to.containSubset({
        namespace: 'test-project',
        annotations: {
          'dashboard.opendatahub.io/nim-pvc': 'true',
          'dashboard.opendatahub.io/nim-subpath': 'arctic-embed-l',
        },
        labels: {
          'opendatahub.io/managed': 'true',
        },
      });
      expect(interception.request.body.metadata.name).to.equal('pr-pvc-test');
      expect(interception.request.body.spec).to.containSubset({
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: '75Gi' } },
        storageClassName: 'openshift-default-sc',
        volumeMode: 'Filesystem',
      });
    });

    // PVC creation — real create
    cy.wait('@createPVC').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createPVC.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });

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
        // NIM mounts a shared memory volume and the PVC cache volume
        volumes: [{ name: 'shm', emptyDir: { medium: 'Memory', sizeLimit: '2Gi' } }],
      });
      // Verify the selected PVC replaced the template placeholder (no leftover nim-pvc)
      const pvcVolumes = interception.request.body.spec.volumes.filter(
        (v: Volume) => v.persistentVolumeClaim,
      );
      expect(pvcVolumes).to.have.length(1);
      expect(pvcVolumes[0].name).to.equal('pr-pvc-test');
      expect(pvcVolumes[0].persistentVolumeClaim.claimName).to.equal('pr-pvc-test');

      const kserveContainer = interception.request.body.spec.containers.find(
        (container: { name: string }) => container.name === 'kserve-container',
      );
      expect(kserveContainer).to.containSubset({
        image: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
        volumeMounts: [{ name: 'shm', mountPath: '/dev/shm' }],
      });
      // Verify PVC volumeMount and NIM_CACHE_PATH env var on kserve-container
      const cacheMount = kserveContainer.volumeMounts.find(
        (vm: { mountPath: string }) => vm.mountPath === '/mnt/models/cache',
      );
      expect(cacheMount).to.not.equal(undefined);
      expect(cacheMount.name).to.equal('pr-pvc-test');
      expect(cacheMount.subPath).to.equal('arctic-embed-l');
      const cachePath = kserveContainer.env.find(
        (e: { name: string }) => e.name === 'NIM_CACHE_PATH',
      );
      expect(cachePath).to.containSubset({ value: '/mnt/models/cache' });
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

  it('should edit a NIM deployment through the wizard', () => {
    initInterceptsToEnableNim({ nimWizard: true });
    initInterceptsToDeployNimInWizard();
    cy.interceptK8sList(
      InferenceServiceModel,
      // Carry the hardware profile annotations so the wizard prefills the saved profile on edit
      mockK8sResourceList([
        mockNimInferenceService({
          hardwareProfileName: 'default-profile',
          hardwareProfileNamespace: 'opendatahub',
          hardwareProfileResourceVersion: '1309350',
          hasExternalRoute: true,
          // Advanced settings prefill from the deployment on edit
          args: ['--verbose', '--log-level=debug'],
          env: [{ name: 'CUSTOM_VAR', value: 'custom-value' }],
        }),
      ]),
    );
    cy.interceptK8sList(
      ServingRuntimeModel,
      // The runtime carries the NIM image on its `kserve-container` so edit-detection recognizes
      // it and prefills the found image (arctic-embed-l 1.0.1 exists in mockNimImages -> happy path).
      // It also carries a PVC cache volume so the PVC field prefills the existing storage selection.
      mockK8sResourceList([
        mockNimServingRuntime({
          image: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
          pvcName: 'my-nim-wizard-pvc',
          subPath: 'arctic-embed-l',
        }),
      ]),
    );
    // The PVC must be in the fetched list for the existing-storage select to render its name
    cy.interceptK8sList(
      { model: PVCModel, ns: 'test-project' },
      mockK8sResourceList([mockPVCK8sResource({ name: 'my-nim-wizard-pvc' })]),
    );
    // Auth is enabled by default on the NIM deployment (no enable-auth=false annotation), so the
    // token auth field reads the deployment's service-account token secret ("<deployment-name>-sa")
    // and prefills the existing service account name from the secret's display name.
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          name: 'my-existing-sa-test-name-sa',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'my-existing-sa',
            'kubernetes.io/service-account.name': 'test-name-sa',
          },
          type: 'kubernetes.io/service-account-token',
          data: { token: btoa('test-token') },
        }),
      ]),
    );

    modelServingGlobal.visit('test-project');

    // The NIM deployment is listed in the model deployments table
    modelServingSection.findDeploymentsTable().should('have.length', 1);
    modelServingGlobal.getModelRow('Test Name').findKebabAction('Edit').click();

    // Step 1: Model source - location is NVIDIA NIM and the existing image is found (no warning)
    modelServingWizardEdit.findModelSourceStep().should('be.enabled');
    modelServingWizardEdit
      .findModelLocationSelect()
      .should('contain.text', ModelLocationSelectOption.NIM)
      .should('be.disabled');
    modelServingWizardEdit.nim
      .findImageSelect()
      .find('input')
      .should('have.value', 'Snowflake Arctic Embed Large Embedding - 1.0.1');
    modelServingWizardEdit.nim
      .findImageSelect()
      .find('[aria-label="Clear input value"]')
      .should('not.exist');
    modelServingWizardEdit.nim.findImageNotFoundWarning().should('not.exist');
    // NIM forces the model type - it cannot be changed
    modelServingWizardEdit.findModelTypeSelect().should('contain.text', ModelTypeLabel.NIM);
    modelServingWizardEdit.findModelTypeSelect().should('be.disabled');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment - name prefilled, no model format select (NIM is legacy KServe)
    modelServingWizardEdit.findModelDeploymentStep().should('be.enabled');
    modelServingWizardEdit.findModelDeploymentNameInput().should('have.value', 'Test Name');
    // The saved hardware profile prefills (only one profile exists, so the selector is disabled)
    modelServingWizardEdit.selectPotentiallyDisabledProfile('default-profile');
    modelServingWizardEdit.findModelFormatSelect().should('not.exist');

    // PVC caching prefills from the existing runtime's cache volume: existing-storage mode,
    // the mounted PVC preselected, and its subpath loaded from the volumeMount
    modelServingWizardEdit.nim
      .findStorageModeSelect()
      .should('contain.text', 'Deploy the NIM image from an existing cluster storage');
    modelServingWizardEdit.nim.findExistingPVCSelect().should('contain.text', 'my-nim-wizard-pvc');
    modelServingWizardEdit.nim.findSubPathInput().should('have.value', 'arctic-embed-l');

    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 3: Advanced settings - external route, token auth, the existing service account, runtime
    // args, and custom env variables all prefill from the deployment on edit
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findExternalRouteCheckbox().should('be.checked');
    modelServingWizardEdit.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizardEdit.findServiceAccountNameInput().should('have.value', 'my-existing-sa');
    modelServingWizardEdit
      .findRuntimeArgsTextBox()
      .should('contain.value', '--verbose\n--log-level=debug');
    modelServingWizardEdit.findEnvVariablesCheckbox().should('be.checked');
    modelServingWizardEdit.findEnvVariableName('0').should('have.value', 'CUSTOM_VAR');
    modelServingWizardEdit.findEnvVariableValue('0').should('have.value', 'custom-value');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
  });
});
