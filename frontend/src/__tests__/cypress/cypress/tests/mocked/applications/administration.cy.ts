import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import { mockK8sResourceList, mockNotebookK8sResource } from '#~/__mocks__';
import type { RoleBindingSubject } from '#~/k8sTypes';
import { mockAllowedUsers } from '#~/__mocks__/mockAllowedUsers';
import { mockNotebookImageInfo } from '#~/__mocks__/mockNotebookImageInfo';
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
  cy.interceptOdh('GET /api/images/:type', { path: { type: 'jupyter' } }, mockNotebookImageInfo());
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

    const userRow = administration.getRow('regularuser1');
    userRow.shouldHavePrivilege('User');
    userRow.shouldHaveLastActivity('Just now');
    userRow.findServerStatusButton().should('have.text', 'View workbench');
    userRow.findKebabAction('Stop workbench').click();

    stopNotebookModal.findStopNotebookServerButton().should('be.enabled');
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
});
