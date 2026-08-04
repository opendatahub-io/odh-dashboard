/**
 * Tests for the Form/YAML toggle on the Create Custom Role page:
 * toggling between views and verifying data preservation.
 */
import { mockDashboardConfig, mockK8sResourceList } from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';

const addRule = (apiGroup: string, resource: string, verb: string) => {
  projectRoles.findAddRuleButton().click();
  projectRoles.findAddRuleModal().should('exist');
  projectRoles.findRuleApiGroupsToggle().click();
  projectRoles.findRuleApiGroupsToggle().parent().find('input').type(apiGroup);
  cy.contains(`Use custom API group "${apiGroup}"`).click();
  projectRoles.findRuleResourceTypesToggle().click();
  projectRoles.findRuleResourceTypesToggle().parent().find('input').type(resource);
  cy.contains(`Use custom resource type "${resource}"`).click();
  projectRoles.findVerbCheckbox(verb).click();
  projectRoles.findRuleSaveButton().click();
};

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

describe('Form/YAML toggle', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);
  });

  it('should toggle from Form to YAML view', () => {
    projectRoles.findRoleNameInput().type('yaml-test-role');
    projectRoles.findDescriptionTextarea().type('Test description');

    projectRoles.findYamlViewToggle().click();

    projectRoles.findYamlView().should('exist');
    projectRoles.findCreateRoleForm().should('not.exist');
  });

  it('should preserve form data when toggling back from YAML to Form', () => {
    projectRoles.findRoleNameInput().type('yaml-test-role');
    addRule('apps', 'deployments', 'get');

    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 1);

    projectRoles.findYamlViewToggle().click();
    projectRoles.findYamlView().should('exist');

    projectRoles.findFormViewToggle().click();
    projectRoles.findCreateRoleForm().should('exist');

    projectRoles.findRoleNameInput().should('have.value', 'yaml-test-role');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 1);
  });
});
