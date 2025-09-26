import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import { mockK8sResourceList, mockNotebookK8sResource } from '#~/__mocks__';
import type { RoleBindingSubject } from '#~/k8sTypes';
import { mockAllowedUsers } from '#~/__mocks__/mockAllowedUsers';
import {
  administration,
  notebookController,
  stopNotebookModal,
} from '#~/__tests__/cypress/cypress/pages/administration';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  asProductAdminUser,
  asProjectEditUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import type { AllowedUser } from '#~/pages/notebookController/screens/admin/types';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import { mockStartNotebookData } from '#~/__mocks__/mockStartNotebookData';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { RouteModel, ImageStreamModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockImageStreamK8sResourceList } from '#~/__mocks__/mockImageStreamK8sResource';

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'group-1',
  },
];

type HandlersProps = {
  allowedUsers?: AllowedUser[];
};

const initIntercepts = ({
  allowedUsers = [mockAllowedUsers({}), mockAllowedUsers({ username: 'regularuser1' })],
}: HandlersProps) => {
  cy.interceptOdh('GET /api/status/openshift-ai-notebooks/allowedUsers', allowedUsers);
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
  cy.interceptK8sList(
    { model: ImageStreamModel, ns: 'opendatahub' },
    mockK8sResourceList(mockImageStreamK8sResourceList()),
  );
};

it('Administration tab should not be accessible for non-project admins', () => {
  initIntercepts({});
  asProjectEditUser();
  notebookController.visit();
  notebookController.findAdministrationTab().should('not.exist');
  notebookController.findSpawnerTab().should('not.exist');
  notebookController.findAppTitle().should('contain', 'Start a basic workbench');
});

describe('Administration Tab', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('Check table with users details', () => {
    initIntercepts({});
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    administration.shouldHaveManageUsersAlert();
    administration.findStopAllServersButton().should('be.disabled');
    const userRow = administration.getRow('test-user');
    userRow.shouldHavePrivilege('User');
    userRow.findServerStatusButton().should('have.text', 'Start your workbench');
    userRow.findServerStatusButton().should('be.enabled');
  });

  it('Users table sorting', () => {
    initIntercepts({});
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    // By user
    administration.findTableHeaderButton('User').click();
    administration.findTableHeaderButton('User').should(be.sortDescending);
    administration.findTableHeaderButton('User').click();
    administration.findTableHeaderButton('User').should(be.sortAscending);

    // By privilege
    administration.findTableHeaderButton('Privilege').click();
    administration.findTableHeaderButton('Privilege').should(be.sortAscending);
    administration.findTableHeaderButton('Privilege').click();
    administration.findTableHeaderButton('Privilege').should(be.sortDescending);

    // By last activity
    administration.findTableHeaderButton('Last activity').click();
    administration.findTableHeaderButton('Last activity').should(be.sortAscending);
    administration.findTableHeaderButton('Last activity').click();
    administration.findTableHeaderButton('Last activity').should(be.sortDescending);

    // By server status
    administration.findTableHeaderButton('Workbench status').click();
    administration.findTableHeaderButton('Workbench status').should(be.sortAscending);
    administration.findTableHeaderButton('Workbench status').click();
    administration.findTableHeaderButton('Workbench status').should(be.sortDescending);
  });

  it('Validate pagination', () => {
    const totalItems = 50;
    const mockAllowedUser: AllowedUser[] = Array.from({ length: totalItems }, (_, i) =>
      mockAllowedUsers({
        username: `Test user-${i}`,
      }),
    );
    initIntercepts({ allowedUsers: mockAllowedUser });
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    // top pagination
    testPagination({ totalItems, firstElement: 'Test user-0', paginationVariant: 'top' });

    // bottom pagination
    testPagination({ totalItems, firstElement: 'Test user-0', paginationVariant: 'bottom' });
  });

  it('Validate that last activity will be "Just now" and user can stop workbench from the table, when notebook lacks the last-activity annotation', () => {
    const allowedUsers = [
      mockAllowedUsers({}),
      mockAllowedUsers({ username: 'regularuser1', lastActivity: 'Now' }),
    ];
    cy.interceptK8s(RouteModel, mockRouteK8sResource({})).as('getWorkbenchURL');
    initIntercepts({ allowedUsers });
    cy.interceptOdh(
      'GET /api/notebooks/openshift-ai-notebooks/:username/status',
      { path: { username: 'jupyter-nb-regularuser1' } },
      {
        notebook: mockNotebookK8sResource({ image: 'code-server-notebook:2023.2' }),
        isRunning: true,
      },
    );
    cy.interceptOdh('PATCH /api/notebooks', mockStartNotebookData({})).as('stopNotebookServer');
    notebookController.visit();
    notebookController.findAdministrationTab().click();

    cy.wait('@getWorkbenchURL');

    const userRow = administration.getRow('regularuser1');
    userRow.shouldHavePrivilege('User');
    userRow.shouldHaveLastActivity('Just now');
    userRow.findServerStatusButton().should('have.text', 'View workbench');
    userRow.findKebabAction('Stop workbench').click();

    stopNotebookModal.findStopNotebookServerButton().should('be.enabled');
    stopNotebookModal
      .findNotebookRouteLink()
      .should(
        'have.attr',
        'href',
        `https://${mockRouteK8sResource({}).spec.host}/notebook/test-project/test-notebook`,
      );
    stopNotebookModal.findStopNotebookServerButton().click();

    cy.wait('@stopNotebookServer').then((interception) => {
      expect(interception.request.body).to.eql({ state: 'stopped', username: 'test-user' });
    });
  });

  it('Validate that clicking on "Start workbench" button will open a form in administartion tab and "Start workbench" button will navigate to notebook server tab', () => {
    initIntercepts({});
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    let userRow = administration.getRow('regularuser1');

    // open a form in administartion tab with impersonate alert
    userRow.findServerStatusButton().click();
    administration.shouldHaveImpersonateAlert();
    administration.shouldHaveNotebookServerForm();
    administration.findImageSelectorRadio('code-server-notebook').should('be.checked');
    administration.findStartServerButton().should('be.enabled');
    administration.findReturnToAdminViewButton().click();

    // Navigate to notebook server tab
    userRow = administration.getRow('test-user');
    userRow.findServerStatusButton().click();
    notebookController.findAppTitle().should('contain', 'Start a basic workbench');
    notebookController.findAppTitle().should('not.contain', 'Administration');
  });

  it('Validate that clicking on "Stop all workbenches" button will show dialog for stopping multiple workbenches', () => {
    const allowedUsers = [
      mockAllowedUsers({ username: 'regularuser2', lastActivity: 'Now' }),
      mockAllowedUsers({ username: 'regularuser1', lastActivity: 'Now' }),
    ];
    initIntercepts({ allowedUsers });
    cy.interceptK8s(RouteModel, mockRouteK8sResource({})).as('getWorkbenchURL');
    administration.mockGetNotebookStatus('jupyter-nb-regularuser1');
    administration.mockGetNotebookStatus('jupyter-nb-regularuser2');
    cy.interceptOdh('PATCH /api/notebooks', mockStartNotebookData({})).as('stopNotebookServer');
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    administration.findStopAllServersButton().should('be.enabled');
    administration.findStopAllServersButton().click();

    stopNotebookModal.findStopNotebookServerButton().should('be.enabled');
    stopNotebookModal.findStopNotebookTitle().should('have.text', 'Stop all workbenches?');
    stopNotebookModal.findStopNotebookServerButton().click();

    cy.wait('@stopNotebookServer');
  });

  it('Validate that clicking on "Stop all workbenches" button will display a link if there is only one workbench to stop', () => {
    const allowedUsers = [mockAllowedUsers({ username: 'regularuser1', lastActivity: 'Now' })];

    initIntercepts({ allowedUsers });
    cy.interceptOdh('PATCH /api/notebooks', mockStartNotebookData({})).as('stopNotebookServer');
    administration.mockGetNotebookStatus('jupyter-nb-regularuser1');
    cy.interceptK8s(RouteModel, mockRouteK8sResource({})).as('getWorkbenchURL');

    notebookController.visit();
    notebookController.findAdministrationTab().click();
    notebookController.visit();
    notebookController.findAdministrationTab().click();
    administration.findStopAllServersButton().should('be.enabled');
    administration.findStopAllServersButton().click();

    stopNotebookModal.findStopNotebookServerButton().should('be.enabled');
    stopNotebookModal.findStopNotebookTitle().should('have.text', 'Stop workbench?');
    stopNotebookModal
      .findNotebookRouteLink()
      .should(
        'have.attr',
        'href',
        `https://${mockRouteK8sResource({}).spec.host}/notebook/test-project/test-notebook`,
      );
    stopNotebookModal.findStopNotebookServerButton().click();

    cy.wait('@stopNotebookServer');
  });

  it('redirect from v2 to v3 route', () => {
    initIntercepts({});
    cy.visitWithLogin('/notebookController/spawner');
    cy.findByTestId('app-page-title').should('have.text', 'Start a basic workbench');
    cy.url().should('include', '/notebook-controller/spawner');
  });
});
