/**
 * Combined tests for the Roles tab:
 * - Feature flag gating (visibility, SSAR access, create role form)
 * - Role template selection flow (Select role template, Import rules from template,
 *   discard changes confirmation, search filtering, and form pre-population)
 */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
  SelfSubjectAccessReviewModel,
} from '../../../../utils/models';
import { asProjectAdminUser, asProjectEditUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';

const initRolesTabIntercepts = ({ roleManagement = true }: { roleManagement?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      roleManagement,
    }),
  );

  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([]));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

const initRolesTemplateIntercepts = () => {
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

describe('Roles tab feature flag gating', () => {
  describe('with roleManagement flag disabled', () => {
    beforeEach(() => {
      asProjectAdminUser();
      initRolesTabIntercepts({ roleManagement: false });
    });

    it('should not show the Roles tab', () => {
      projectRoles.visitOverview(NAMESPACE);
      projectRoles.findRolesTab().should('not.exist');
    });

    it('should redirect from /roles/create to the project page when flag is disabled', () => {
      cy.visitWithLogin(`/projects/${NAMESPACE}/roles/create`);
      cy.url().should('not.include', '/roles/create');
      cy.url().should('include', `/projects/${NAMESPACE}`);
    });
  });

  describe('with roleManagement flag enabled', () => {
    beforeEach(() => {
      asProjectAdminUser();
      initRolesTabIntercepts({ roleManagement: true });
    });

    it('should show the Roles tab', () => {
      projectRoles.visit(NAMESPACE);
      projectRoles.findRolesTab().should('exist');
    });

    it('should show the Create role button in the Roles tab', () => {
      projectRoles.visit(NAMESPACE);
      projectRoles.findCreateRoleButton().should('exist');
    });

    it('should render the create role form with all fields and placeholder states', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findCreateRoleForm().should('exist');
      projectRoles.findRoleNameInput().should('exist');
      projectRoles.findDescriptionTextarea();
      projectRoles.findAddLabelButton().should('exist');
      projectRoles.findPermissionsEmptyState().should('contain.text', 'No rules added');
      projectRoles.findSelectRoleTemplateButton().should('not.be.disabled');
      projectRoles.findAddRuleButton().should('not.be.disabled');
      projectRoles.findImportTemplateButton().should('not.be.disabled');
    });

    it('should enable the submit button when name is filled', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findRoleNameInput().type('my-test-role');
      projectRoles.findSubmitButton().should('be.enabled');
    });

    it('should disable submit when a label row has a touched empty key', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findRoleNameInput().type('my-test-role');
      projectRoles.findSubmitButton().should('be.enabled');

      projectRoles.findAddLabelButton().click();
      projectRoles.findSubmitButton().should('be.enabled');

      projectRoles.findLabelKeyInput(0).focus().blur();
      projectRoles.findSubmitButton().should('be.disabled');

      projectRoles.findLabelKeyInput(0).type('team');
      projectRoles.findSubmitButton().should('be.enabled');
    });

    it('should disable submit when duplicate label keys exist', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findRoleNameInput().type('my-test-role');

      projectRoles.findAddLabelButton().click();
      projectRoles.findLabelKeyInput(0).type('team');
      projectRoles.findLabelValueInput(0).type('platform');
      projectRoles.findSubmitButton().should('be.enabled');

      projectRoles.findAddLabelButton().click();
      projectRoles.findLabelKeyInput(1).type('team');
      projectRoles.findLabelValueInput(1).type('other');
      projectRoles.findSubmitButton().should('be.disabled');
    });

    it('should add and remove label rows', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findLabelKeyInput(0).should('not.exist');

      projectRoles.findAddLabelButton().click();
      projectRoles.findLabelKeyInput(0).should('exist');

      projectRoles.findAddLabelButton().click();
      projectRoles.findLabelKeyInput(1).should('exist');

      projectRoles.findLabelRemoveButton(1).click();
      projectRoles.findLabelKeyInput(1).should('not.exist');

      projectRoles.findLabelRemoveButton(0).click();
      projectRoles.findLabelKeyInput(0).should('not.exist');
    });

    it('should navigate back to roles tab on cancel', () => {
      projectRoles.visitCreateRole(NAMESPACE);
      projectRoles.findCancelButton().click();
      cy.url().should('include', `/projects/${NAMESPACE}`);
      cy.url().should('include', 'section=roles');
    });
  });

  describe('with roleManagement flag enabled but user lacks create permission', () => {
    beforeEach(() => {
      asProjectEditUser();
      initRolesTabIntercepts({ roleManagement: true });
      cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
        const { resourceAttributes } = req.body.spec;
        if (!resourceAttributes) {
          req.reply(mockSelfSubjectAccessReview({ allowed: true }));
          return;
        }
        if (
          resourceAttributes.resource === 'roles' &&
          resourceAttributes.verb === 'create' &&
          resourceAttributes.group === 'rbac.authorization.k8s.io'
        ) {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: false,
            }),
          );
        } else {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: true,
            }),
          );
        }
      });
    });

    it('should show the Roles tab when user has list access to roles', () => {
      projectRoles.visit(NAMESPACE);
      projectRoles.findRolesTab().should('exist');
    });
  });

  describe('with roleManagement flag enabled but user lacks list permission on roles', () => {
    beforeEach(() => {
      asProjectEditUser();
      initRolesTabIntercepts({ roleManagement: true });
      cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
        const { resourceAttributes } = req.body.spec;
        if (!resourceAttributes) {
          req.reply(mockSelfSubjectAccessReview({ allowed: true }));
          return;
        }
        if (
          resourceAttributes.resource === 'roles' &&
          resourceAttributes.group === 'rbac.authorization.k8s.io'
        ) {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: false,
            }),
          );
        } else {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: true,
            }),
          );
        }
      });
    });

    it('should not show the Roles tab when user lacks list access to roles', () => {
      projectRoles.visitOverview(NAMESPACE);
      projectRoles.findRolesTab().should('not.exist');
    });
  });
});

describe('Select role template (header button)', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initRolesTemplateIntercepts();
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
    projectRoles.findReplaceContentModal().contains('Discard unsaved changes?').should('exist');
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

describe('Add rules from template (toolbar button)', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initRolesTemplateIntercepts();
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
    cy.findByTestId('select-multi-typeahead-apps').click();
    cy.press(Cypress.Keyboard.Keys.TAB);
    projectRoles.findRuleResourceTypesToggle().click();
    projectRoles.findRuleResourceTypesToggle().parent().find('input').type('deployments');
    cy.findByTestId('select-multi-typeahead-Deployments').click();
    cy.press(Cypress.Keyboard.Keys.TAB);
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
