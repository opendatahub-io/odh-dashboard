import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockToolCallingValidatedConfiguration } from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { modelServingWizard } from '@odh-dashboard/cypress/cypress/pages/modelServing';

const mockValidatedConfigurationsInitialData = {
  validatedConfigurations: [mockToolCallingValidatedConfiguration()],
};

const initIntercepts = () => {
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
      disableNIMModelServing: true,
      disableKServe: false,
    }),
  );
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
};

describe('Preconfigure deployment validated arguments', () => {
  it('should render validated argument cards when validatedConfigurations is provided', () => {
    initIntercepts();
    modelServingWizard.visitWithValidatedConfigurations(mockValidatedConfigurationsInitialData);

    modelServingWizard.findPreconfigureStep().should('be.enabled');
    modelServingWizard.findValidatedConfigurationSection('args').should('be.visible');
    modelServingWizard.findValidatedConfigurationOption('tool-calling').should('be.visible');
    modelServingWizard
      .findValidatedConfigurationOption('tool-calling')
      .should('contain.text', 'Tool calling');
  });

  it('should toggle validated argument card selection', () => {
    initIntercepts();
    modelServingWizard.visitWithValidatedConfigurations(mockValidatedConfigurationsInitialData);

    modelServingWizard.findValidatedConfigurationOptionCheckbox('tool-calling').click();
    modelServingWizard
      .findValidatedConfigurationOption('tool-calling')
      .should('have.attr', 'aria-selected', 'true');
    modelServingWizard.findValidatedConfigurationOptionCheckbox('tool-calling').click();
    modelServingWizard
      .findValidatedConfigurationOption('tool-calling')
      .should('have.attr', 'aria-selected', 'false');
  });

  it('should display formatted CLI args in the view arguments popover', () => {
    initIntercepts();
    modelServingWizard.visitWithValidatedConfigurations(mockValidatedConfigurationsInitialData);

    modelServingWizard.findValidatedConfigurationViewArguments('tool-calling').click();
    modelServingWizard
      .findValidatedConfigurationArgumentsPopoverContent('tool-calling')
      .should('contain.text', '--enable-auto-tool-choice');
    modelServingWizard
      .findValidatedConfigurationArgumentsPopoverContent('tool-calling')
      .should('contain.text', '--tool-call-parser hermes');
  });

  it('should not render validated arguments when validatedConfigurations is absent', () => {
    initIntercepts();
    modelServingWizard.visit();

    modelServingWizard.findPreconfigureStep().should('be.enabled');
    cy.findByTestId('validated-configuration-section-args').should('not.exist');
  });

  it('should not render option cards when a configuration has no options', () => {
    initIntercepts();
    modelServingWizard.visitWithValidatedConfigurations({
      validatedConfigurations: [
        {
          forField: 'args',
          title: 'Validated arguments',
          description: 'No options available for this model.',
          options: [],
        },
      ],
    });

    modelServingWizard.findPreconfigureStep().should('be.enabled');
    modelServingWizard.findValidatedConfigurationSection('args').should('be.visible');
    cy.findByTestId('validated-configuration-options-args')
      .find('[data-testid^="validated-configuration-option-"]')
      .should('not.exist');
  });
});
