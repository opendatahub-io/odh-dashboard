import { mockClusterSettings } from '@odh-dashboard/internal/__mocks__/mockClusterSettings';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockDsc } from '@odh-dashboard/internal/__mocks__/mockDsc';
import { clusterSettings, globalProjectSettings } from '../../../pages/clusterSettings';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { DataScienceClusterModel, ProjectModel } from '../../../utils/models';

describe('Global Project Settings', () => {
  beforeEach(() => {
    asClusterAdminUser();
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    cy.interceptOdh(
      'GET /api/cluster-settings',
      mockClusterSettings({ globalMLflowNamespaces: [] }),
    );
    cy.interceptK8sList({ model: DataScienceClusterModel }, mockK8sResourceList([mockDsc({})]));
    cy.interceptK8sList(
      { model: ProjectModel },
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: 'project-alpha', displayName: 'Project Alpha' }),
        mockProjectK8sResource({ k8sName: 'mlflow-workspace', displayName: 'MLflow Workspace' }),
      ]),
    );
  });

  it('should not show the global project section when feature flag is off', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ globalProjectPrompts: false }));
    clusterSettings.visit();
    globalProjectSettings.findSection().should('not.exist');
  });

  it('should show the global project section when MLflow is available', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ globalProjectPrompts: true }));
    clusterSettings.visit();
    globalProjectSettings.findSection().should('exist');
    globalProjectSettings.findSelectorToggle().should('contain.text', 'Select a project');
  });

  it('should display the currently configured namespace', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        globalProjectPrompts: true,
        globalMLflowNamespaces: ['mlflow-workspace'],
      }),
    );
    cy.interceptOdh(
      'GET /api/cluster-settings',
      mockClusterSettings({ globalMLflowNamespaces: ['mlflow-workspace'] }),
    );
    clusterSettings.visit();
    globalProjectSettings.findSelectorToggle().should('contain.text', 'MLflow Workspace');
  });

  it('should enable page-level save and submit when a project is selected', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ globalProjectPrompts: true }));
    cy.interceptOdh('PUT /api/cluster-settings', { success: true, error: '' }).as(
      'saveClusterSettings',
    );

    clusterSettings.visit();
    globalProjectSettings.selectProject('Project Alpha');
    clusterSettings.findSubmitButton().should('be.enabled');
    clusterSettings.findSubmitButton().click();

    cy.wait('@saveClusterSettings').then((interception) => {
      expect(interception.request.body.globalMLflowNamespaces).to.eql(['project-alpha']);
    });
  });

  it('should send empty array when None is selected', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        globalProjectPrompts: true,
        globalMLflowNamespaces: ['mlflow-workspace'],
      }),
    );
    cy.interceptOdh(
      'GET /api/cluster-settings',
      mockClusterSettings({ globalMLflowNamespaces: ['mlflow-workspace'] }),
    );
    cy.interceptOdh('PUT /api/cluster-settings', { success: true, error: '' }).as(
      'saveClusterSettings',
    );

    clusterSettings.visit();
    globalProjectSettings.selectNone();
    clusterSettings.findSubmitButton().should('be.enabled');
    clusterSettings.findSubmitButton().click();

    cy.wait('@saveClusterSettings').then((interception) => {
      expect(interception.request.body.globalMLflowNamespaces).to.eql([]);
    });
  });
});
