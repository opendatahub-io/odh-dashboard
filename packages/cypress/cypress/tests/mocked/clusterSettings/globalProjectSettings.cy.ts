import { mockClusterSettings } from '@odh-dashboard/internal/__mocks__/mockClusterSettings';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
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

  it('should enable page-level save and submit when a project is selected for the first time', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ globalProjectPrompts: true }));
    cy.interceptOdh('PUT /api/cluster-settings', { success: true, error: '' }).as(
      'saveClusterSettings',
    );

    clusterSettings.visit();
    globalProjectSettings.selectProject('Project Alpha');
    globalProjectSettings.findWarningModal().should('not.exist');
    clusterSettings.findSubmitButton().should('be.enabled');
    clusterSettings.findSubmitButton().click();

    cy.wait('@saveClusterSettings').then((interception) => {
      expect(interception.request.body.globalMLflowNamespaces).to.eql(['project-alpha']);
    });
  });

  describe('clear warning modal', () => {
    beforeEach(() => {
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
    });

    it('should show the clear warning modal when clearing a configured project', () => {
      clusterSettings.visit();
      globalProjectSettings.selectClearSelection();
      globalProjectSettings.findWarningModal().should('exist');
      globalProjectSettings.findWarningModal().should('contain.text', 'Clear the global project?');
    });

    it('should send empty array when clear is confirmed', () => {
      cy.interceptOdh('PUT /api/cluster-settings', { success: true, error: '' }).as(
        'saveClusterSettings',
      );

      clusterSettings.visit();
      globalProjectSettings.selectClearSelection();
      globalProjectSettings.findWarningConfirmButton().click();
      globalProjectSettings.findWarningModal().should('not.exist');
      clusterSettings.findSubmitButton().should('be.enabled');
      clusterSettings.findSubmitButton().click();

      cy.wait('@saveClusterSettings').then((interception) => {
        expect(interception.request.body.globalMLflowNamespaces).to.eql([]);
      });
    });

    it('should revert when clear is cancelled', () => {
      clusterSettings.visit();
      globalProjectSettings.selectClearSelection();
      globalProjectSettings.findWarningCancelButton().click();
      globalProjectSettings.findWarningModal().should('not.exist');
      globalProjectSettings.findSelectorToggle().should('contain.text', 'MLflow Workspace');
      clusterSettings.findSubmitButton().should('be.disabled');
    });
  });

  describe('switch warning modal', () => {
    beforeEach(() => {
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
    });

    it('should show the switch warning modal when changing to a different project', () => {
      clusterSettings.visit();
      globalProjectSettings.selectProject('Project Alpha');
      globalProjectSettings.findWarningModal().should('exist');
      globalProjectSettings.findWarningModal().should('contain.text', 'Change the global project?');
    });

    it('should update the selection when switch is confirmed', () => {
      cy.interceptOdh('PUT /api/cluster-settings', { success: true, error: '' }).as(
        'saveClusterSettings',
      );

      clusterSettings.visit();
      globalProjectSettings.selectProject('Project Alpha');
      globalProjectSettings.findWarningConfirmButton().click();
      globalProjectSettings.findWarningModal().should('not.exist');
      globalProjectSettings.findSelectorToggle().should('contain.text', 'Project Alpha');
      clusterSettings.findSubmitButton().should('be.enabled');
      clusterSettings.findSubmitButton().click();

      cy.wait('@saveClusterSettings').then((interception) => {
        expect(interception.request.body.globalMLflowNamespaces).to.eql(['project-alpha']);
      });
    });

    it('should revert when switch is cancelled', () => {
      clusterSettings.visit();
      globalProjectSettings.selectProject('Project Alpha');
      globalProjectSettings.findWarningCancelButton().click();
      globalProjectSettings.findWarningModal().should('not.exist');
      globalProjectSettings.findSelectorToggle().should('contain.text', 'MLflow Workspace');
      clusterSettings.findSubmitButton().should('be.disabled');
    });
  });
});
