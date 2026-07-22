/**
 * Tests for the Duplicate Role flow: loading source role, pre-populating form
 * with "Copy of" display name, cleared k8s name, submitting via POST.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mock404Error, mock409Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';
const SOURCE_ROLE_NAME = 'my-custom-role';

const sourceRole = mockRoleK8sResource({
  name: SOURCE_ROLE_NAME,
  namespace: NAMESPACE,
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [
    {
      verbs: ['get', 'list'],
      apiGroups: ['apps'],
      resources: ['deployments'],
    },
  ],
});

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([sourceRole]));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
  cy.interceptK8s('GET', { model: RoleModel, ns: NAMESPACE, name: SOURCE_ROLE_NAME }, sourceRole);
};

describe('Duplicate Role', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should show "Duplicate custom role" as page title', () => {
    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    cy.findByTestId('app-page-title').should('contain.text', 'Duplicate custom role');
  });

  it('should pre-populate the display name with "Copy of" prefix', () => {
    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    projectRoles.findRoleNameInput().should('have.value', `Copy of ${SOURCE_ROLE_NAME}`);
  });

  it('should have submit button enabled when form is pre-populated', () => {
    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    projectRoles.findSubmitButton().should('be.enabled');
  });

  it('should have k8s resource name field editable (not immutable)', () => {
    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    cy.findByTestId('role-editResourceLink').should('exist').click();
    cy.findByTestId('role-resourceName')
      .should('not.be.disabled')
      .should('not.have.attr', 'readonly');
    cy.findByTestId('role-resourceName').clear();
    cy.findByTestId('role-resourceName').type('new-resource-name');
    cy.findByTestId('role-resourceName').should('have.value', 'new-resource-name');
  });

  it('should submit via POST when duplicating a role', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      mockRoleK8sResource({ name: 'copy-of-my-custom-role', namespace: NAMESPACE }),
    ).as('createRole');

    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    projectRoles.findSubmitButton().click();

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata.name).to.equal('copy-of-my-custom-role');
      expect(interception.request.body.metadata.namespace).to.equal(NAMESPACE);
      expect(interception.request.body.metadata.labels).to.have.property(
        'opendatahub.io/dashboard',
        'true',
      );
      expect(interception.request.body.rules).to.have.length(1);
      expect(interception.request.body.rules[0].verbs).to.deep.equal(['get', 'list']);
      expect(interception.request.body.rules[0].apiGroups).to.deep.equal(['apps']);
      expect(interception.request.body.rules[0].resources).to.deep.equal(['deployments']);
    });

    cy.url().should('include', `/projects/${NAMESPACE}`);
    cy.url().should('include', 'section=roles');
  });

  it('should show error when duplicate name already exists', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      {
        statusCode: 409,
        body: mock409Error({ message: 'Role already exists' }),
      },
    ).as('createRole');

    projectRoles.visitDuplicateRole(NAMESPACE, SOURCE_ROLE_NAME);
    projectRoles.findRoleNameInput().type('conflicting-name');
    projectRoles.findSubmitButton().click();

    cy.wait('@createRole');
    projectRoles.findSubmitErrorAlert().should('exist');
    projectRoles.findSubmitButton().should('be.enabled');
  });

  it('should show error page when source role does not exist (404)', () => {
    cy.interceptK8s(
      'GET',
      { model: RoleModel, ns: NAMESPACE, name: 'non-existent-role' },
      { statusCode: 404, body: mock404Error({}) },
    );

    cy.visitWithLogin(`/projects/${NAMESPACE}/roles/non-existent-role/duplicate`);
    cy.contains('Unable to load role').should('exist');
  });

  it('should navigate to duplicate page from table kebab action', () => {
    projectRoles.visit(NAMESPACE);

    const row = projectRoles.getRow(SOURCE_ROLE_NAME);
    row.findKebabAction('Duplicate role').click();

    cy.url().should('include', `/roles/${SOURCE_ROLE_NAME}/duplicate`);
  });
});
