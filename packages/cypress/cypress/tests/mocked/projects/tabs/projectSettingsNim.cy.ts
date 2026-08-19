import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockOdhApplication } from '@odh-dashboard/k8s-core/__mocks__/mockOdhApplication';
import { mockNimServingRuntimeTemplate } from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { projectDetailsSettingsTab } from '../../../../pages/projects';
import { NIMAccountModel, ProjectModel, TemplateModel } from '../../../../utils/models';
import { asProjectEditUser } from '../../../../utils/mockUsers';

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

  const mockProject = mockProjectK8sResource({ enableNIM: true });
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

describe('NIM Settings Card', () => {
  beforeEach(() => {
    asProjectEditUser();
  });

  it('should render the NIM settings card with enable button when NIMAccount does not exist', () => {
    initIntercepts({ nimAccountExists: false });
    projectDetailsSettingsTab.visitSettings('test-project');
    projectDetailsSettingsTab.findNIMEnableButton().should('exist');
  });

  it('should render the NIM settings card with management buttons when NIMAccount exists', () => {
    initIntercepts({ nimAccountExists: true });
    projectDetailsSettingsTab.visitSettings('test-project');
    projectDetailsSettingsTab.findNIMRemoveButton().should('exist');
    projectDetailsSettingsTab.findNIMReplaceKeyButton().should('exist');
  });
});
