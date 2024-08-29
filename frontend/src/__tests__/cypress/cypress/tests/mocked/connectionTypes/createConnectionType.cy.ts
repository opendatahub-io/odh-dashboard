import {
  mockConnectionTypeConfigMap,
  mockConnectionTypeConfigMapObj,
} from '~/__mocks__/mockConnectionType';
import { createConnectionTypePage } from '~/__tests__/cypress/cypress/pages/connectionTypes';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig } from '~/__mocks__';
import type { ConnectionTypeField } from '~/concepts/connectionTypes/types';
import { toConnectionTypeConfigMap } from '~/concepts/connectionTypes/utils';

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

  it('Allows create button with valid name and category', () => {
    const categorySection = createConnectionTypePage.getCategorySection();
    createConnectionTypePage.visitCreatePage();

    createConnectionTypePage.findConnectionTypeName().should('have.value', '');
    createConnectionTypePage.findSubmitButton().should('be.disabled');

    createConnectionTypePage.findConnectionTypeName().type('hello');
    categorySection.findCategoryTable();
    categorySection.findMultiGroupSelectButton('Object-storage');
    createConnectionTypePage.findSubmitButton().should('be.enabled');
  });

  it('Selects category or creates new category', () => {
    createConnectionTypePage.visitCreatePage();

    const categorySection = createConnectionTypePage.getCategorySection();

    categorySection.findCategoryTable();
    categorySection.findMultiGroupSelectButton('Object-storage');

    categorySection.findChipItem('Object storage').should('exist');
    categorySection.clearMultiChipItem();

    categorySection.findMultiGroupSelectButton('Object-storage');

    categorySection.findMultiGroupInput().type('Database');
    categorySection.findMultiGroupSelectButton('Database');

    categorySection.findMultiGroupInput().type('New category');

    categorySection.findMultiGroupSelectButton('Option');
    categorySection.findChipItem('New category').should('exist');
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
    row1.findType().should('have.text', 'Text - Short');
    row1.findDefault().should('have.text', '-');
    row1.findRequired().not('be.checked');

    // Row 2 - Short text field
    const row2 = createConnectionTypePage.getFieldsTableRow(2);
    row2.findName().should('contain.text', 'Short text 2');
    row2.findType().should('have.text', 'Text - Short');
    row2.findDefault().should('have.text', 'This is the default value');
    row2.findRequired().should('be.checked');
  });
});

describe('edit', () => {
  const existing = mockConnectionTypeConfigMapObj({
    name: 'existing',
    fields: [
      {
        type: 'section',
        name: 'header1',
      },
      {
        type: 'short-text',
        name: 'field1',
        envVar: 'short-text-1',
        required: false,
        properties: {},
      },
      {
        type: 'short-text',
        name: 'field2',
        envVar: 'short-text-2',
        required: true,
        properties: {},
      },
    ] as ConnectionTypeField[],
  });

  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableConnectionTypes: false,
      }),
    );
  });

  it('Drag and drop field rows in table', () => {
    cy.interceptOdh(
      'GET /api/connection-types/:name',
      { path: { name: 'existing' } },
      toConnectionTypeConfigMap(existing),
    );
    createConnectionTypePage.visitEditPage('existing');

    createConnectionTypePage.getFieldsTableRow(0).findName().should('contain.text', 'header1');
    createConnectionTypePage.getFieldsTableRow(1).findName().should('contain.text', 'field1');
    createConnectionTypePage.getFieldsTableRow(2).findName().should('contain.text', 'field2');

    createConnectionTypePage.getFieldsTableRow(0).dragToIndex(2);

    createConnectionTypePage.getFieldsTableRow(0).findName().should('contain.text', 'field1');
    createConnectionTypePage.getFieldsTableRow(1).findName().should('contain.text', 'field2');
    createConnectionTypePage.getFieldsTableRow(2).findName().should('contain.text', 'header1');

    createConnectionTypePage.getFieldsTableRow(1).dragToIndex(0);

    createConnectionTypePage.getFieldsTableRow(0).findName().should('contain.text', 'field2');
    createConnectionTypePage.getFieldsTableRow(1).findName().should('contain.text', 'field1');
    createConnectionTypePage.getFieldsTableRow(2).findName().should('contain.text', 'header1');
  });

  it('Move field to section modal', () => {
    cy.interceptOdh(
      'GET /api/connection-types/:name',
      { path: { name: 'existing' } },
      mockConnectionTypeConfigMap({
        fields: [
          {
            type: 'short-text',
            name: 'field1',
            envVar: 'short-text-1',
            properties: {},
          },
          {
            type: 'section',
            name: 'header1',
          },
          {
            type: 'short-text',
            name: 'field2',
            envVar: 'short-text-2',
            properties: {},
          },
          {
            type: 'section',
            name: 'header2',
          },
          {
            type: 'short-text',
            name: 'field3',
            envVar: 'short-text-3',
            properties: {},
          },
        ],
      }),
    );
    createConnectionTypePage.visitEditPage('existing');
    createConnectionTypePage.shouldHaveTableRowNames([
      'field1',
      'header1',
      'field2',
      'header2',
      'field3',
    ]);

    createConnectionTypePage
      .getFieldsTableRow(4)
      .findKebabAction('Move to section heading')
      .click();
    // move to default which is the first section
    cy.findByTestId('section-heading-select').should('be.disabled');
    cy.findByTestId('modal-submit-button').click();
    createConnectionTypePage.shouldHaveTableRowNames([
      'field1',
      'header1',
      'field3',
      'field2',
      'header2',
    ]);

    createConnectionTypePage
      .getFieldsTableRow(0)
      .findKebabAction('Move to section heading')
      .click();
    cy.findByTestId('section-heading-select').click();
    cy.findByTestId('section-heading-select').findSelectOption('header2').click();
    cy.findByTestId('modal-submit-button').click();
    createConnectionTypePage.shouldHaveTableRowNames([
      'header1',
      'field3',
      'field2',
      'header2',
      'field1',
    ]);
  });
});
