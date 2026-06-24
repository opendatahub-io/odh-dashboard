/**
 * Tests for the Form/YAML toggle on the Create Role page: toggle visibility,
 * switching between views, YAML content verification, and data preservation.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([]));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

describe('Create Role - Form/YAML toggle', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);
  });

  it('should display the Form/YAML toggle group', () => {
    projectRoles.findFormYamlToggle().should('exist');
    projectRoles.findFormViewToggle().should('exist');
    projectRoles.findYamlViewToggle().should('exist');
  });

  it('should have Form selected by default', () => {
    projectRoles.findFormViewToggle().find('button').should('have.attr', 'aria-pressed', 'true');
    projectRoles.findCreateRoleForm().should('exist');
  });

  it('should switch to YAML view when YAML toggle is clicked', () => {
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlView().should('exist');
    projectRoles.findCreateRoleForm().should('not.be.visible');
    cy.testA11y();
  });

  it('should display title and description in YAML view', () => {
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlViewTitle().should('have.text', 'Role configuration YAML');
    projectRoles
      .findYamlViewDescription()
      .should('contain.text', 'View the live, read-only YAML for this role');
  });

  it('should display code editor with YAML content', () => {
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlCodeEditor().should('exist');
  });

  it('should display a valid Role manifest in YAML view', () => {
    projectRoles.findRoleNameInput().type('test-role');
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlCodeEditor().should('exist');
    projectRoles.findYamlEditorContainer().contains('rbac.authorization.k8s.io/v1');
    projectRoles.findYamlEditorContainer().contains('Role');
    projectRoles.findYamlEditorContainer().contains('test-role');
    projectRoles.findYamlEditorContainer().contains(NAMESPACE);
  });

  it('should reflect description in YAML', () => {
    projectRoles.findRoleNameInput().type('test-role');
    projectRoles.findDescriptionTextarea().type('My role description');
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlEditorContainer().contains('My role description');
  });

  it('should reflect rules in YAML', () => {
    projectRoles.findRoleNameInput().type('test-role');
    projectRoles.findAddRuleButton().click();
    projectRoles.findAddRuleModal().should('exist');
    projectRoles.findRuleApiGroupsToggle().click();
    projectRoles.findRuleApiGroupsToggle().parent().find('input').type('apps');
    cy.contains('Use custom API group "apps"').click();
    projectRoles.findRuleResourceTypesToggle().click();
    projectRoles.findRuleResourceTypesToggle().parent().find('input').type('deployments');
    cy.contains('Use custom resource type "deployments"').click();
    projectRoles.findVerbCheckbox('get').click();
    projectRoles.findRuleSaveButton().click();
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlEditorContainer().contains('get');
    projectRoles.findYamlEditorContainer().contains('deployments');
  });

  it('should switch back to Form view and preserve data', () => {
    projectRoles.findRoleNameInput().type('preserved-role');
    projectRoles.findDescriptionTextarea().type('Preserved description');

    projectRoles.findYamlViewToggle().click();
    projectRoles.findYamlView().should('exist');

    projectRoles.findFormViewToggle().click();
    projectRoles.findCreateRoleForm().should('be.visible');

    projectRoles.findRoleNameInput().should('have.value', 'preserved-role');
    projectRoles.findDescriptionTextarea().should('have.value', 'Preserved description');
  });

  it('should keep footer visible in YAML view', () => {
    projectRoles.findYamlViewToggle().click();

    projectRoles.findSubmitButton().should('exist');
    projectRoles.findCancelButton().should('exist');
  });

  it('should display full-screen toggle button in YAML view', () => {
    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlFullscreenToggle().should('exist');
  });
});
