import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { jupyterCard } from '#~/__tests__/cypress/cypress/pages/components/JupyterCard';
import { warningValidationCard } from '#~/__tests__/cypress/cypress/pages/components/WarningValidationCard';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';

describe('Explore Page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', null, mockComponents());
    explorePage.visit();
  });

  it('check start basic workbench card details', () => {
    jupyterCard.findBrandImage().should('be.visible');
    jupyterCard.findCardTitle().should('have.text', 'Start basic workbench');
    jupyterCard
      .findCardBody()
      .should(
        'have.text',
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      );
  });

  it('should have selectable cards', () => {
    jupyterCard.findExploreCard('jupyter').click();
    jupyterCard.findDrawerPanel().should('be.visible');
  });

  it('card title should be visible', () => {
    jupyterCard.findExploreCard('rhoai').should('not.exist');
  });

  it('should validate warning message for test keys', () => {
    cy.interceptOdh(
      'GET /api/components',
      null,
      mockComponents({
        extraComponents: [
          {
            metadata: {
              annotations: {
                'opendatahub.io/categories': 'Validation,Warning',
              },
              name: 'warning-validation-test',
            },
            spec: {
              category: 'Test',
              description: 'A test component for warning validation scenarios.',
              displayName: 'Warning Validation Test',
              docsLink: 'https://docs.redhat.com',
              getStartedLink: 'https://docs.redhat.com',
              getStartedMarkDown:
                'This is a test component used to validate warning messages in the UI.',
              img: '', // No image for test component
              internalRoute: 'warningValidationTest',
              provider: 'test-provider',
              quickStart: '',
              support: '',
              hidden: false,
              shownOnEnabledPage: false,
              isEnabled: false,
              link: null,
              enable: {
                title: 'Warning Validation Test',
                actionLabel: 'Enable',
                description: 'Enable Warning Validation Test.',
                validationSecret: 'warning-validation-test-validation-secret',
                validationJob: 'warning-validation-test-validation-job',
                inProgressText: 'Validation in progress...',
                variableDisplayText: {
                  key: 'Key',
                },
                variableHelpText: {
                  key: 'Key',
                },
                variables: {
                  key: 'password',
                },
                warningValidation: {
                  field: 'key',
                  validationRegex: '^test-warning-.*',
                  message: 'This key starts with test-warning-',
                },
              },
            },
          },
        ],
      }),
    );
    asProductAdminUser();
    explorePage.visit();

    // First, verify the warning validation test card is visible
    warningValidationCard.findExploreCard('warning-validation-test').should('be.visible');

    // Click the warning validation test card to open the drawer
    warningValidationCard.findExploreCard('warning-validation-test').click();

    // Wait for the drawer to be visible
    warningValidationCard.findDrawerPanel().should('be.visible');

    // Debug: Check if enable button exists (might be disabled)
    // cy.get('[data-testid="enable-app"]').should('exist');
    warningValidationCard.findEnableButton().should('exist').click();

    // Test that a matching key triggers the warning
    cy.step('Input test key that matches warning regex');
    warningValidationCard.findKeyInput().clear().type('test-warning-123');

    // Verify warning message appears
    cy.step('Verify warning message appears for test key');
    warningValidationCard.findWarningAlert().should('be.visible');
    warningValidationCard
      .findWarningAlert()
      .should('contain', 'This key starts with test-warning-');

    // Test that a non-matching key does NOT trigger the warning
    cy.step('Input key that does not match warning regex');
    warningValidationCard.findKeyInput().clear().type('production-key-456');

    // Verify warning message disappears
    cy.step('Verify warning message disappears for production key');
    warningValidationCard.findWarningAlert().should('not.exist');
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/explore');
    cy.findByTestId('app-page-title').should('have.text', 'Explore');
    cy.url().should('include', '/applications/explore');
  });
});
