import {
  mockConnectionTypeConfigMap,
  mockConnectionTypeConfigMapObj,
} from '~/__mocks__/mockConnectionType';
import { createConnectionTypePage } from '~/__tests__/cypress/cypress/pages/connectionTypes';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig } from '~/__mocks__';

describe('create', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableConnectionTypes: false,
      }),
    );
  });

  it('Display base page', () => {
    createConnectionTypePage.visitCreatePage();

    createConnectionTypePage.findConnectionTypeName().should('exist');
    createConnectionTypePage.findConnectionTypeDesc().should('exist');
    createConnectionTypePage.findConnectionTypeEnableCheckbox().should('exist');
    createConnectionTypePage.findConnectionTypePreviewToggle().should('exist');
  });

  it('Allows create button with valid name', () => {
    createConnectionTypePage.visitCreatePage();

    createConnectionTypePage.findConnectionTypeName().should('have.value', '');
    createConnectionTypePage.findSubmitButton().should('be.disabled');

    createConnectionTypePage.findConnectionTypeName().type('hello');
    createConnectionTypePage.findSubmitButton().should('be.enabled');
  });
});

describe('duplicate', () => {
  const existing = mockConnectionTypeConfigMapObj({ name: 'existing' });

  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableConnectionTypes: false,
      }),
    );
    cy.interceptOdh(
      'GET /api/connection-types/:name',
      { path: { name: 'existing' } },
      mockConnectionTypeConfigMap({ name: 'existing' }),
    );
  });

  it('Prefill details from existing connection', () => {
    createConnectionTypePage.visitDuplicatePage('existing');

    createConnectionTypePage
      .findConnectionTypeName()
      .should(
        'have.value',
        `Duplicate of ${existing.metadata.annotations?.['openshift.io/display-name']}`,
      );
    createConnectionTypePage
      .findConnectionTypeDesc()
      .should('have.value', existing.metadata.annotations?.['openshift.io/description']);
    createConnectionTypePage.findConnectionTypeEnableCheckbox().should('be.checked');
  });

  it('Prefill fields table from existing connection', () => {
    createConnectionTypePage.visitDuplicatePage('existing');

    createConnectionTypePage
      .findAllFieldsTableRows()
      .should('have.length', existing.data?.fields?.length);

    // Row 0 - Section
    const row0 = createConnectionTypePage.getFieldsTableRow(0);
    row0.findName().should('contain.text', 'Short text');
    row0.findSectionHeading().should('exist');

    // Row 1 - Short text field
    const row1 = createConnectionTypePage.getFieldsTableRow(1);
    row1.findName().should('contain.text', 'Short text 1');
    row1.findType().should('have.text', 'Short text');
    row1.findDefault().should('have.text', '-');
    row1.findRequired().not('be.checked');

    // Row 2 - Short text field
    const row2 = createConnectionTypePage.getFieldsTableRow(2);
    row2.findName().should('contain.text', 'Short text 2');
    row2.findType().should('have.text', 'Short text');
    row2.findDefault().should('have.text', 'This is the default value');
    row2.findRequired().should('be.checked');
  });
});
