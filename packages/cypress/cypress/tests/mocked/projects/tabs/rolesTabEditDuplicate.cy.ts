/**
 * Tests for the Edit Role and Duplicate Role pages: form pre-population
 * with existing role data, PUT payload for edit, and POST payload for duplicate.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
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
const ROLE_NAME = 'my-custom-role';

const existingRole = mockRoleK8sResource({
  name: ROLE_NAME,
  namespace: NAMESPACE,
  rules: [
    { verbs: ['get', 'list'], apiGroups: ['apps'], resources: ['deployments'] },
    { verbs: ['get'], apiGroups: [''], resources: ['pods'] },
  ],
  labels: {
    'opendatahub.io/dashboard': 'true',
    'labels.opendatahub.io/team': 'platform',
  },
});

existingRole.metadata.resourceVersion = '12345';
existingRole.metadata.annotations = {
  'openshift.io/display-name': 'My Custom Role',
  'openshift.io/description': 'A role for testing',
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
  cy.interceptK8s(RoleModel, existingRole);
};

describe('Edit Role page', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should pre-populate form with existing role data', () => {
    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);

    projectRoles.findRoleNameInput().should('have.value', 'My Custom Role');
    projectRoles.findDescriptionTextarea().should('have.value', 'A role for testing');
    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 2);
  });

  it('should submit PUT request with resourceVersion and updated data', () => {
    cy.interceptK8s(
      'PUT',
      RoleModel,
      mockRoleK8sResource({ name: ROLE_NAME, namespace: NAMESPACE }),
    ).as('updateRole');

    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findDescriptionTextarea().clear().type('Updated description');
    projectRoles.findSubmitButton().click();

    cy.wait('@updateRole').then((interception) => {
      expect(interception.request.body.metadata.resourceVersion).to.equal('12345');
      expect(interception.request.body.metadata.annotations).to.have.property(
        'openshift.io/description',
        'Updated description',
      );
      expect(interception.request.body.rules).to.have.length(2);
    });
  });
});

describe('Duplicate Role page', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should pre-populate form with "Copy of" name and existing rules', () => {
    projectRoles.visitDuplicateRole(NAMESPACE, ROLE_NAME);

    projectRoles.findRoleNameInput().should('have.value', 'Copy of My Custom Role');
    projectRoles.findPermissionRulesTable().should('exist');
    projectRoles.findPermissionRulesTable().find('tbody tr').should('have.length', 2);
  });

  it('should submit POST request with copied rules', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      mockRoleK8sResource({ name: 'copy-of-my-custom-role', namespace: NAMESPACE }),
    ).as('createRole');

    projectRoles.visitDuplicateRole(NAMESPACE, ROLE_NAME);
    projectRoles.findSubmitButton().click();

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata).to.not.have.property('resourceVersion');
      expect(interception.request.body.rules).to.have.length(2);
      expect(interception.request.body.rules[0].resources).to.include('deployments');
      expect(interception.request.body.rules[1].resources).to.include('pods');
    });
  });
});
