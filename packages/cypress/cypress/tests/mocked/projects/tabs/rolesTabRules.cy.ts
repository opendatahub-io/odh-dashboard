/**
 * Tests for the permission rules section of the Create Custom Role form:
 * editing rules, removing rules, Add Rule modal validation, and rules toolbar filter/search.
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

describe('Edit rule', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);
  });

  it('should open edit modal with pre-populated fields', () => {
    addRule('apps', 'deployments', 'get');

    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 1);
    projectRoles.findRuleEditButton(0).click();

    projectRoles.findAddRuleModal().should('exist');
    projectRoles.findAddRuleModal().contains('Edit rule').should('exist');
    projectRoles.findRuleApiGroupsToggle().should('contain.text', 'apps');
    projectRoles.findRuleResourceTypesToggle().should('contain.text', 'deployments');
    projectRoles.findVerbCheckbox('get').should('be.checked');
  });

  it('should update rule in table after editing', () => {
    addRule('apps', 'deployments', 'get');

    projectRoles.findRuleEditButton(0).click();
    projectRoles.findAddRuleModal().should('exist');

    projectRoles.findVerbCheckbox('list').click();
    projectRoles.findRuleSaveButton().click();

    projectRoles.findAddRuleModal().should('not.exist');
    projectRoles
      .findPermissionRuleActionCells()
      .first()
      .should('contain.text', 'get')
      .and('contain.text', 'list');
  });
});

describe('Remove rule', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);
  });

  it('should remove a rule from the table', () => {
    addRule('apps', 'deployments', 'get');
    addRule('batch', 'jobs', 'create');

    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 2);
    projectRoles.findRuleRemoveButton(0).click();
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 1);
  });

  it('should show empty state when last rule is removed', () => {
    addRule('apps', 'deployments', 'get');

    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 1);
    projectRoles.findRuleRemoveButton(0).click();

    projectRoles.findPermissionRulesTable().should('not.exist');
    projectRoles.findPermissionsEmptyState().should('exist');
  });
});

describe('Add Rule modal validation', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);
  });

  it('should disable save when required fields are empty', () => {
    projectRoles.findAddRuleButton().click();
    projectRoles.findAddRuleModal().should('exist');

    projectRoles.findRuleSaveButton().should('be.disabled');

    projectRoles.findRuleApiGroupsToggle().click();
    projectRoles.findRuleApiGroupsToggle().parent().find('input').type('apps');
    cy.contains('Use custom API group "apps"').click();
    projectRoles.findRuleSaveButton().should('be.disabled');

    projectRoles.findRuleResourceTypesToggle().click();
    projectRoles.findRuleResourceTypesToggle().parent().find('input').type('deployments');
    cy.contains('Use custom resource type "deployments"').click();
    projectRoles.findRuleSaveButton().should('be.disabled');
  });

  it('should enable save when all required fields have selections', () => {
    projectRoles.findAddRuleButton().click();
    projectRoles.findAddRuleModal().should('exist');

    projectRoles.findRuleApiGroupsToggle().click();
    projectRoles.findRuleApiGroupsToggle().parent().find('input').type('apps');
    cy.contains('Use custom API group "apps"').click();

    projectRoles.findRuleResourceTypesToggle().click();
    projectRoles.findRuleResourceTypesToggle().parent().find('input').type('deployments');
    cy.contains('Use custom resource type "deployments"').click();

    projectRoles.findVerbCheckbox('get').click();
    projectRoles.findRuleSaveButton().should('be.enabled');
  });

  it('should not add a rule when modal is cancelled', () => {
    projectRoles.findAddRuleButton().click();
    projectRoles.findAddRuleModal().should('exist');

    projectRoles.findRuleApiGroupsToggle().click();
    projectRoles.findRuleApiGroupsToggle().parent().find('input').type('apps');
    cy.contains('Use custom API group "apps"').click();

    projectRoles.findRuleResourceTypesToggle().click();
    projectRoles.findRuleResourceTypesToggle().parent().find('input').type('deployments');
    cy.contains('Use custom resource type "deployments"').click();

    projectRoles.findVerbCheckbox('get').click();
    projectRoles.findRuleCancelButton().click();

    projectRoles.findAddRuleModal().should('not.exist');
    projectRoles.findPermissionsEmptyState().should('exist');
  });
});

describe('Rules toolbar', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-reader').click();
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 5);
  });

  it('should filter rules by API groups', () => {
    projectRoles.findRulesFilterToggle().click();
    cy.findByRole('option', { name: 'API groups' }).click();

    projectRoles.findRulesSearchInput().type('kubeflow.org');
    projectRoles
      .findPermissionRulesTable()
      .find('tbody tr')
      .should('have.length.lessThan', 5)
      .and('have.length.greaterThan', 0);
  });

  it('should filter rules by resource types', () => {
    projectRoles.findRulesFilterToggle().click();
    cy.findByRole('option', { name: 'Resource types' }).click();

    projectRoles.findRulesSearchInput().type('notebooks');
    projectRoles
      .findPermissionRulesTable()
      .find('tbody tr')
      .should('have.length.lessThan', 5)
      .and('have.length.greaterThan', 0);
  });

  it('should filter rules by actions', () => {
    projectRoles.findRulesFilterToggle().click();
    cy.findByRole('option', { name: 'Actions' }).click();

    projectRoles.findRulesSearchInput().type('get');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 5);

    projectRoles.findRulesSearchInput().clear().type('create');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 0);
  });

  it('should reset search text when filter column changes', () => {
    projectRoles.findRulesSearchInput().type('notebooks');
    projectRoles.findRulesSearchInput().should('have.value', 'notebooks');

    projectRoles.findRulesFilterToggle().click();
    cy.findByRole('option', { name: 'API groups' }).click();

    projectRoles.findRulesSearchInput().should('have.value', '');
  });
});
