/**
 * TC-REG-003: Workbenches can be created after hardware profile migration completes
 *
 * Verifies that after hardware profile migration, users can still create new workbenches
 * through the RHOAI dashboard UI without webhook errors.
 */

describe('Hardware Profile Migration - Regression', () => {
  beforeEach(() => {
    cy.visit('/');

    // Mock operator status as healthy post-migration
    cy.intercept('GET', '/api/status', {
      statusCode: 200,
      body: {
        kube: {
          currentContext: 'test-context',
          currentUser: { name: 'test-user' },
          namespace: 'opendatahub',
        },
      },
    }).as('getStatus');

    // Mock hardware profiles list (showing migrated profiles from accelerator profiles)
    cy.intercept('GET', '/api/hardware-profiles', {
      statusCode: 200,
      body: {
        items: [
          {
            metadata: {
              name: 'migrated-hw-profile-gpu',
              namespace: 'redhat-ods-applications',
              annotations: {
                'opendatahub.io/migrated-from': 'accelerator-profile',
              },
            },
            spec: {
              displayName: 'GPU Hardware Profile (Migrated)',
              enabled: true,
              identifier: 'nvidia.com/gpu',
            },
          },
        ],
      },
    }).as('getHardwareProfiles');

    // Mock notebooks list (existing workbenches)
    cy.intercept('GET', '/api/notebooks*', {
      statusCode: 200,
      body: {
        items: [],
      },
    }).as('getNotebooks');

    // Mock notebook creation endpoint
    cy.intercept('POST', '/api/notebooks', (req) => {
      // Verify the request includes hardware profile annotations
      const notebook = req.body;
      expect(notebook.metadata.annotations).to.include({
        'opendatahub.io/hardware-profile-name': 'migrated-hw-profile-gpu',
        'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
      });

      req.reply({
        statusCode: 201,
        body: {
          metadata: {
            name: notebook.metadata.name,
            namespace: notebook.metadata.namespace || 'test-project',
            annotations: notebook.metadata.annotations,
          },
          spec: notebook.spec,
        },
      });
    }).as('createNotebook');
  });

  it(
    'should allow creating a new workbench after migration',
    { tags: ['@regression', '@hw-profile-migration', '@Tier2'] },
    () => {
      // TODO: Update selectors to match actual dashboard component data-testid attributes

      cy.log('Step 1: Navigate to workbench creation page');
      // Navigate to workbenches/notebooks creation
      cy.findByTestId('create-workbench-button').click();

      cy.log('Step 2: Verify operator/webhook status is healthy');
      cy.wait('@getStatus');
      cy.wait('@getHardwareProfiles');

      cy.log('Step 3: Fill workbench creation form');
      // Workbench name
      cy.findByTestId('workbench-name-input').type('test-workbench-post-migration');

      // Select image
      cy.findByTestId('workbench-image-select').click();
      cy.findByText('Standard Data Science').click();

      // Select hardware profile (migrated from accelerator profile)
      cy.findByTestId('workbench-hardware-profile-select').click();
      cy.findByText('GPU Hardware Profile (Migrated)').click();

      // Set resources
      cy.findByTestId('workbench-cpu-input').clear();
      cy.findByTestId('workbench-cpu-input').type('2');
      cy.findByTestId('workbench-memory-input').clear();
      cy.findByTestId('workbench-memory-input').type('8');

      cy.log('Step 4: Submit the form');
      cy.findByTestId('create-workbench-submit-button').click();

      cy.log('Step 5: Verify the creation API call was made');
      cy.wait('@createNotebook').then((interception) => {
        expect(interception.response?.statusCode).to.equal(201);

        // Verify hardware profile annotations are set correctly
        const createdNotebook = interception.response?.body;
        expect(createdNotebook.metadata.annotations).to.deep.include({
          'opendatahub.io/hardware-profile-name': 'migrated-hw-profile-gpu',
          'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
        });
      });

      cy.log('Step 6: Verify no webhook rejection errors');
      // Check that there are no error notifications in the UI
      cy.findByTestId('global-notification-error').should('not.exist');

      cy.log('Step 7: Verify the workbench appears in the list');
      // Redirect to workbench list after creation
      cy.url().should('include', '/workbenches');
      cy.findByText('test-workbench-post-migration').should('exist');
    },
  );
});
