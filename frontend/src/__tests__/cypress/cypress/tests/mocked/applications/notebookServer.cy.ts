import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockK8sResourceList, mockNotebookK8sResource } from '~/__mocks__';
import type { RoleBindingSubject } from '~/types';
import { mockAllowedUsers } from '~/__mocks__/mockAllowedUsers';
import { mockNotebookImageInfo } from '~/__mocks__/mockNotebookImageInfo';
import { mockStartNotebookData } from '~/__mocks__/mockStartNotebookData';
import { notebookServer } from '~/__tests__/cypress/cypress/pages/notebookServer';
import { asProductAdminUser, asProjectEditUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import {
  notebookController,
  stopNotebookModal,
} from '~/__tests__/cypress/cypress/pages/administration';
import { homePage } from '~/__tests__/cypress/cypress/pages/home/home';

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
};

it('Administration tab should not be accessible for non-project admins', () => {
  initIntercepts();
  asProjectEditUser();
  notebookServer.visit();
  notebookController.findAdministrationTab().should('not.exist');
  notebookController.findSpawnerTab().should('not.exist');
  notebookController.findAppTitle().should('contain', 'Start a notebook server');
});

describe('NotebookServer', () => {
  beforeEach(() => {
    initIntercepts();
    asProductAdminUser();
  });

  it('should start notebook server', () => {
    notebookServer.visit();
    notebookServer.findStartServerButton().should('be.visible');
    notebookServer.findStartServerButton().click();
    notebookServer.findEventlog().click();

    cy.wait('@startNotebookServer').then((interception) => {
      expect(interception.request.body).to.eql({
        notebookSizeName: 'XSmall',
        imageName: 'code-server-notebook',
        imageTagName: '2023.2',
        acceleratorProfile: { acceleratorProfiles: [], count: 0, unknownProfileDetected: false },
        envVars: { configMap: {}, secrets: {} },
        state: 'started',
      });
    });
  });

  it('should stop notebook server', () => {
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
