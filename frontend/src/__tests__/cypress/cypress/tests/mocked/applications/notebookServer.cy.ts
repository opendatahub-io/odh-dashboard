import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockDashboardConfig,
  mockStorageClassList,
  mockCustomSecretK8sResource,
} from '#~/__mocks__';
import type { RoleBindingSubject } from '#~/k8sTypes';
import { mockAllowedUsers } from '#~/__mocks__/mockAllowedUsers';
import { mockNotebookImageInfo } from '#~/__mocks__/mockNotebookImageInfo';
import { mockStartNotebookData } from '#~/__mocks__/mockStartNotebookData';
import { notebookServer } from '#~/__tests__/cypress/cypress/pages/notebookServer';
import {
  asClusterAdminUser,
  asProjectEditUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import {
  notebookController,
  stopNotebookModal,
} from '#~/__tests__/cypress/cypress/pages/administration';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';
import {
  AcceleratorProfileModel,
  StorageClassModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import type { EnvironmentVariable, NotebookData } from '#~/types';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'group-1',
  },
];
const initIntercepts = () => {
  cy.interceptOdh('POST /api/notebooks', mockStartNotebookData({})).as('startNotebookServer');
  cy.interceptOdh(
    'GET /api/rolebindings/opendatahub/openshift-ai-notebooks-image-pullers',
    mockK8sResourceList([
      mockRoleBindingK8sResource({
        name: 'group-1',
        subjects: groupSubjects,
        roleRefName: 'edit',
      }),
    ]),
  );
  cy.interceptOdh('GET /api/images/:type', { path: { type: 'jupyter' } }, mockNotebookImageInfo());
  cy.interceptOdh('GET /api/status/openshift-ai-notebooks/allowedUsers', mockAllowedUsers({}));
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableStorageClasses: false,
    }),
  );
  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([
      mockAcceleratorProfile({
        name: 'test-gpu',
        displayName: 'Test GPU',
        namespace: 'opendatahub',
        uid: 'uid',
      }),
    ]),
  );
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
};

it('Administration tab should not be accessible for non-product admins', () => {
  initIntercepts();
  asProjectEditUser();
  notebookServer.visit();
  notebookController.findAdministrationTab().should('not.exist');
  notebookController.findSpawnerTab().should('not.exist');
  notebookController.findAppTitle().should('contain', 'Start a basic workbench');
});

describe('NotebookServer', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should start a workbench', () => {
    notebookServer.visit();
    notebookServer.findStartServerButton().should('be.visible');
    notebookServer.findStartServerButton().click();
    notebookServer.findEventlog().click();

    cy.wait('@startNotebookServer').then((interception) => {
      expect(interception.request.body).to.eql({
        podSpecOptions: {
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
          tolerations: [
            {
              effect: 'NoSchedule',
              key: 'NotebooksOnlyChange',
              operator: 'Exists',
            },
          ],
          nodeSelector: {},
          lastSizeSelection: 'XSmall',
        },
        imageName: 'code-server-notebook',
        imageTagName: '2023.2',
        envVars: { configMap: {}, secrets: {} },
        state: 'started',
        storageClassName: 'openshift-default-sc',
      });
    });
  });

  it('should start a workbench with params', () => {
    const existingParamEnvs: EnvironmentVariable[] = [
      {
        name: 'one',
        valueFrom: {
          configMapKeyRef: {
            key: 'one',
            name: 'jupyterhub-singleuser-profile-test-2duser-envs',
          },
        },
      },
      {
        name: 'two',
        valueFrom: {
          secretMapKeyRef: {
            key: 'two',
            name: 'jupyterhub-singleuser-profile-test-2duser-envs',
          },
        },
      },
    ];
    cy.interceptOdh(
      'GET /api/notebooks/openshift-ai-notebooks/:username/status',
      { path: { username: 'jupyter-nb-test-2duser' } },
      {
        notebook: mockNotebookK8sResource({ additionalEnvs: existingParamEnvs }),
        isRunning: false,
      },
    );
    cy.interceptOdh(
      'GET /api/envs/configmap/openshift-ai-notebooks/:filename',
      { path: { filename: 'jupyterhub-singleuser-profile-test-2duser-envs' } },
      mockConfigMap({
        name: 'jupyterhub-singleuser-profile-test-2duser-envs',
        namespace: 'openshift-ai-notebooks',
        data: {
          one: 'test',
        },
      }),
    );
    cy.interceptOdh(
      'GET /api/envs/secret/openshift-ai-notebooks/:filename',
      { path: { filename: 'jupyterhub-singleuser-profile-test-2duser-envs' } },
      mockCustomSecretK8sResource({
        name: 'jupyterhub-singleuser-profile-test-2duser-envs',
        namespace: 'openshift-ai-notebooks',
        data: {
          two: 'dGVzdDIK',
        },
      }),
    );
    notebookServer.visit();
    notebookServer.findEnvVarKey(0).should('have.value', 'one');
    notebookServer.findEnvVarIsSecretCheckbox(0).should('not.be.checked');
    notebookServer.findEnvVarValue(0).should('have.value', 'test');

    notebookServer.findEnvVarKey(1).should('have.value', 'two');
    notebookServer.findEnvVarIsSecretCheckbox(1).should('be.checked');
    notebookServer.findEnvVarSecretEyeToggle(1).click();
    // Seems Cypress doesn't handle atob well -- expect(atob('dGVzdDIK')).to.eql('test2') is not true, `test2\n` is the value of atob in Cypress
    notebookServer.findEnvVarValue(1).should('contain.value', 'test2');
  });

  it('should start a workbench with hardware profile', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableHardwareProfiles: false,
      }),
    );

    notebookServer.visit();
    notebookServer.findHardwareProfileSelect().click();
    notebookServer
      .findHardwareProfileSelectOptionValues()
      .should('not.satisfy', (arr: string[]) => arr.some((item) => item.includes('Test GPU')));
    notebookServer
      .findHardwareProfileSelect()
      .findSelectOption(
        'Large CPU: Request = 7 Cores; Limit = 7 Cores; Memory: Request = 56 GiB; Limit = 56 GiB',
      )
      .click();
    notebookServer.findHardwareProfileSelect().should('contain', 'Large');
    notebookServer.findStartServerButton().should('be.visible');
    notebookServer.findStartServerButton().click();

    cy.wait('@startNotebookServer').then((interception) => {
      const { podSpecOptions } = interception.request.body as NotebookData;

      expect(podSpecOptions.selectedAcceleratorProfile).to.eq(undefined);
      expect(podSpecOptions.selectedHardwareProfile).not.to.eq(undefined);
      expect(podSpecOptions.selectedHardwareProfile?.spec.displayName).to.eq('Large');
      expect(podSpecOptions.selectedHardwareProfile?.spec.identifiers).to.eql([
        {
          displayName: 'CPU',
          resourceType: 'CPU',
          identifier: 'cpu',
          minCount: '7',
          maxCount: '14',
          defaultCount: '7',
        },
        {
          displayName: 'Memory',
          resourceType: 'Memory',
          identifier: 'memory',
          minCount: '56Gi',
          maxCount: '56Gi',
          defaultCount: '56Gi',
        },
      ]);
    });
  });

  it('should start a workbench with accelerator profile', () => {
    notebookServer.visit();
    notebookServer.findAcceleratorProfileSelect().click();
    notebookServer.findAcceleratorProfileSelect().findSelectOption('Test GPU').click();
    notebookServer.findAcceleratorProfileSelect().should('contain', 'Test GPU');
    notebookServer.findStartServerButton().should('be.visible');
    notebookServer.findStartServerButton().click();

    cy.wait('@startNotebookServer').then((interception) => {
      expect(interception.request.body).to.eql({
        podSpecOptions: {
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
              'nvidia.com/gpu': 1,
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
              'nvidia.com/gpu': 1,
            },
          },
          tolerations: [
            {
              key: 'nvidia.com/gpu',
              operator: 'Exists',
              effect: 'NoSchedule',
            },
            {
              effect: 'NoSchedule',
              key: 'NotebooksOnlyChange',
              operator: 'Exists',
            },
          ],
          nodeSelector: {},
          lastSizeSelection: 'XSmall',
          selectedAcceleratorProfile: mockAcceleratorProfile({
            name: 'test-gpu',
            displayName: 'Test GPU',
            namespace: 'opendatahub',
            uid: 'uid',
          }),
        },
        imageName: 'code-server-notebook',
        imageTagName: '2023.2',
        envVars: { configMap: {}, secrets: {} },
        state: 'started',
        storageClassName: 'openshift-default-sc',
      });
    });
  });

  it('should stop a workbench', () => {
    cy.interceptOdh(
      'GET /api/notebooks/openshift-ai-notebooks/:username/status',
      { path: { username: 'jupyter-nb-test-2duser' } },
      {
        notebook: mockNotebookK8sResource({ image: 'code-server-notebook:2023.2' }),
        isRunning: true,
      },
    );
    cy.interceptOdh('PATCH /api/notebooks', mockStartNotebookData({})).as('stopNotebookServer');
    notebookServer.visit();
    notebookServer.findStopServerButton().should('be.visible');
    notebookServer.findStopServerButton().click();

    cy.interceptOdh(
      'GET /api/notebooks/openshift-ai-notebooks/:username/status',
      { path: { username: 'jupyter-nb-test-2duser' } },
      {
        notebook: mockNotebookK8sResource({ image: 'code-server-notebook:2023.2' }),
        isRunning: false,
      },
    );

    stopNotebookModal.findStopNotebookServerButton().should('be.enabled');
    stopNotebookModal.findStopNotebookServerButton().click();

    cy.wait('@stopNotebookServer').then((interception) => {
      expect(interception.request.body).to.eql({ state: 'stopped', username: 'test-user' });
    });
  });

  it('should return to the enabled page on cancel', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    notebookServer.visit();
    notebookServer.findCancelStartServerButton().should('be.visible');
    notebookServer.findCancelStartServerButton().click();

    cy.findByTestId('app-page-title').should('have.text', 'Enabled');

    homePage.initHomeIntercepts({ disableHome: true });
    notebookServer.visit();
    notebookServer.findCancelStartServerButton().should('be.visible');
    notebookServer.findCancelStartServerButton().click();

    cy.findByTestId('app-page-title').should('have.text', 'Enabled');
  });
});
