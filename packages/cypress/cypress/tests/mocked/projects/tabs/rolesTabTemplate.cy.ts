/**
 * Tests for the role template selection flow: Select role template (header button),
 * Import rules from template (toolbar button), discard changes confirmation,
 * search filtering, and form pre-population.
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

describe('Select role template (header button)', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should open template modal directly when form is clean', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateModal().should('exist');
    projectRoles.findSelectTemplateModal().contains('Select a role template').should('exist');
    cy.testA11y();
  });

  it('should show confirmation after selecting a template when form has content', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-role');

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateModal().should('exist');
    projectRoles.findSelectTemplateButton('workbench-maintainer').click();

    projectRoles.findSelectTemplateModal().should('not.exist');
    projectRoles.findReplaceContentModal().should('exist');
    projectRoles.findReplaceContentModal().contains('Replace current content?').should('exist');
    cy.testA11y();
  });

  it('should apply template after confirming replace', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-role');

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-maintainer').click();

    projectRoles.findReplaceContentModal().should('exist');
    projectRoles.findReplaceConfirmButton().click();

    projectRoles.findReplaceContentModal().should('not.exist');
    projectRoles.findRoleNameInput().should('have.value', 'Workbench maintainer');
    projectRoles
      .findDescriptionTextarea()
      .should(
        'have.value',
        'A set of rules that grants users to act as the admin of the workbench component.',
      );
    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 6);
  });

  it('should not apply template when cancelling confirmation', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-role');

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-maintainer').click();

    projectRoles.findReplaceContentModal().should('exist');
    projectRoles.findReplaceCancelButton().click();

    projectRoles.findReplaceContentModal().should('not.exist');
    projectRoles.findRoleNameInput().should('have.value', 'my-role');
  });

  it('should pre-populate form with template name and rules (replace semantics)', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-maintainer').click();

    projectRoles.findSelectTemplateModal().should('not.exist');
    projectRoles.findRoleNameInput().should('have.value', 'Workbench maintainer');
    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 6);
  });

  it('should display template categories and templates', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateModal().should('exist');

    cy.contains('Workbench management templates').should('exist');
    cy.contains('Workbench maintainer').should('exist');
    cy.contains('Workbench reader').should('exist');
    cy.contains('Workbench updater').should('exist');
  });

  it('should filter templates by search', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findTemplateSearchInput().type('reader');

    cy.contains('Workbench reader').should('exist');
    cy.contains('Workbench maintainer').should('not.exist');
    cy.contains('Workbench updater').should('not.exist');
  });

  it('should display explicit verbs instead of wildcards for workbench-maintainer template', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-maintainer').click();

    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRuleActionCells().each(($cell) => {
      expect($cell.text()).to.not.equal('All');
      expect($cell.text()).to.not.contain('*');
    });
    projectRoles
      .findPermissionRuleActionCells()
      .first()
      .should('contain.text', 'get')
      .and('contain.text', 'create')
      .and('contain.text', 'delete');
  });

  it('should display explicit verbs instead of wildcards for workbench-updater template', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findSelectRoleTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-updater').click();

    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRuleActionCells().each(($cell) => {
      expect($cell.text()).to.not.equal('All');
      expect($cell.text()).to.not.contain('*');
    });
  });
});

describe('Import rules from template (toolbar button)', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should open template modal directly from empty state', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findImportTemplateButton().click();
    projectRoles.findSelectTemplateModal().should('exist');
    projectRoles.findSelectTemplateModal().contains('Add rules from template').should('exist');
  });

  it('should show "Add rules" buttons in addRules mode', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findImportTemplateButton().click();
    projectRoles.findSelectTemplateModal().should('exist');

    projectRoles.findSelectTemplateButton('workbench-reader').should('contain', 'Add rules');
  });

  it('should populate rules when template is selected from toolbar', () => {
    projectRoles.visitCreateRole(NAMESPACE);

    projectRoles.findImportTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-reader').click();

    projectRoles.findSelectTemplateModal().should('not.exist');
    projectRoles.findPermissionRulesTable().should('exist');
  });

  it('should open template modal directly even when rules already exist', () => {
    projectRoles.visitCreateRole(NAMESPACE);

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

    projectRoles.findImportTemplateButton().click();
    projectRoles.findReplaceContentModal().should('not.exist');
    projectRoles.findSelectTemplateModal().should('exist');
  });

  it('should append rules without changing name/description (append semantics)', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-custom-role');
    projectRoles.findDescriptionTextarea().type('My description');

    projectRoles.findImportTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-reader').click();

    projectRoles.findRoleNameInput().should('have.value', 'my-custom-role');
    projectRoles.findDescriptionTextarea().should('have.value', 'My description');
    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 5);

    projectRoles.findImportTemplateButton().click();
    projectRoles.findSelectTemplateButton('workbench-reader').click();

    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 10);
  });
});
