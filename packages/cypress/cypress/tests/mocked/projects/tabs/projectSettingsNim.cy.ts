import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockNimServingRuntimeTemplate } from '@odh-dashboard/internal/__mocks__/mockLegacyNimResource';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { mockOdhApplication } from '@odh-dashboard/internal/__mocks__/mockOdhApplication';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { projectDetailsSettingsTab } from '../../../../pages/projects';
import {
  NIMAccountModel,
  ProjectModel,
  SelfSubjectAccessReviewModel,
  TemplateModel,
} from '../../../../utils/models';
import { asProjectEditUser } from '../../../../utils/mockUsers';

const NIM_DENIED_RESOURCES = ['accounts', 'secrets'];

const denyNIMAccess = () => {
  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;
    const denied = NIM_DENIED_RESOURCES.includes(resourceAttributes.resource);
    req.reply(mockSelfSubjectAccessReview({ ...resourceAttributes, allowed: !denied }));
  });
};

const initIntercepts = ({
  nimAccountExists = false,
}: {
  nimAccountExists?: boolean;
} = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.TRUSTY_AI]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableNIMModelServing: false,
      nimWizard: true,
    }),
  );

  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);

  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: true,
      isEnabled: true,
      canInstall: false,
      error: '',
    },
  );

  const mockProject = mockProjectK8sResource({});
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
  cy.interceptK8s(ProjectModel, mockProject);

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(
    { model: TemplateModel, ns: 'opendatahub' },
    mockK8sResourceList([templateMock]),
  );
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    { model: NIMAccountModel, ns: 'test-project' },
    mockK8sResourceList(nimAccountExists ? [mockNimAccount({ namespace: 'test-project' })] : []),
  );
};

describe('NIM Settings Card RBAC', () => {
  it('Settings tab should be visible for project edit users', () => {
    asProjectEditUser();
    initIntercepts();
    projectDetailsSettingsTab.visit('test-project');
    projectDetailsSettingsTab.findTab('Settings').should('exist');
  });

  describe('with all project contributor permissions', () => {
    beforeEach(() => {
      asProjectEditUser();
    });

    it('NIM enable button should be clickable when user has permissions', () => {
      initIntercepts({ nimAccountExists: false });
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab
        .findNIMEnableButton()
        .should('not.have.attr', 'aria-disabled', 'true');
    });

    it('NIM management buttons should be clickable when user has permissions', () => {
      initIntercepts({ nimAccountExists: true });
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab
        .findNIMRemoveButton()
        .should('not.have.attr', 'aria-disabled', 'true');
      projectDetailsSettingsTab
        .findNIMReplaceKeyButton()
        .should('not.have.attr', 'aria-disabled', 'true');
    });
  });

  describe('without NIM permissions', () => {
    beforeEach(() => {
      asProjectEditUser();
    });

    it('NIM enable button should be disabled when user lacks permissions', () => {
      initIntercepts({ nimAccountExists: false });
      denyNIMAccess();
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.findNIMEnableButton().should('have.attr', 'aria-disabled', 'true');
    });

    it('NIM management buttons should be disabled when user lacks permissions', () => {
      initIntercepts({ nimAccountExists: true });
      denyNIMAccess();
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.findNIMRemoveButton().should('have.attr', 'aria-disabled', 'true');
      projectDetailsSettingsTab
        .findNIMReplaceKeyButton()
        .should('have.attr', 'aria-disabled', 'true');
    });
  });
});
