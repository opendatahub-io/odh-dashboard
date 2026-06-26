import {
  mock404Error,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockTrustyAIServiceForDbK8sResource } from '@odh-dashboard/internal/__mocks__/mockTrustyAIServiceK8sResource';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { projectDetailsSettingsTab } from '../../../../pages/projects';
import {
  ProjectModel,
  SelfSubjectAccessReviewModel,
  TrustyAIApplicationsModel,
} from '../../../../utils/models';
import { asProjectEditUser } from '../../../../utils/mockUsers';

const TRUSTY_DENIED_RESOURCES = ['trustyaiservices', 'secrets'];

const denyTrustyAIAccess = () => {
  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;
    const denied = TRUSTY_DENIED_RESOURCES.includes(resourceAttributes.resource);
    req.reply(mockSelfSubjectAccessReview({ ...resourceAttributes, allowed: !denied }));
  });
};

const initIntercepts = ({
  trustyAIInstalled = false,
}: {
  trustyAIInstalled?: boolean;
} = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.TRUSTY_AI]: { managementState: 'Managed' },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableTrustyBiasMetrics: false,
    }),
  );

  const mockProject = mockProjectK8sResource({});
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
  cy.interceptK8s(ProjectModel, mockProject);

  if (trustyAIInstalled) {
    cy.interceptK8s(TrustyAIApplicationsModel, mockTrustyAIServiceForDbK8sResource({}));
  } else {
    cy.interceptK8s(
      { model: TrustyAIApplicationsModel, ns: 'test-project', name: 'trustyai-service' },
      { statusCode: 404, body: mock404Error({}) },
    );
  }
};

describe('TrustyAI Settings Card RBAC', () => {
  describe('with all project contributor permissions', () => {
    beforeEach(() => {
      asProjectEditUser();
    });

    it('Configure button should be clickable when user has permissions', () => {
      initIntercepts({ trustyAIInstalled: false });
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.trustyai
        .findInstallButton()
        .should('not.have.attr', 'aria-disabled', 'true');
    });

    it('Uninstall button should be clickable when user has permissions', () => {
      initIntercepts({ trustyAIInstalled: true });
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.trustyai
        .findUninstallButton()
        .should('not.have.attr', 'aria-disabled', 'true');
    });
  });

  describe('without TrustyAI permissions', () => {
    beforeEach(() => {
      asProjectEditUser();
    });

    it('Configure button should be disabled when user lacks permissions', () => {
      initIntercepts({ trustyAIInstalled: false });
      denyTrustyAIAccess();
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.trustyai
        .findInstallButton()
        .should('have.attr', 'aria-disabled', 'true');
    });

    it('Uninstall button should be disabled when user lacks permissions', () => {
      initIntercepts({ trustyAIInstalled: true });
      denyTrustyAIAccess();
      projectDetailsSettingsTab.visitSettings('test-project');
      projectDetailsSettingsTab.trustyai
        .findUninstallButton()
        .should('have.attr', 'aria-disabled', 'true');
    });
  });
});
