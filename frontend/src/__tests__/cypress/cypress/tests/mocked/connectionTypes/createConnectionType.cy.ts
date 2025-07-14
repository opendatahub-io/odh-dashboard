import {
  mockConnectionTypeConfigMap,
  mockConnectionTypeConfigMapObj,
} from '#~/__mocks__/mockConnectionType';
import { createConnectionTypePage } from '#~/__tests__/cypress/cypress/pages/connectionTypes';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig } from '#~/__mocks__';
import type { ConnectionTypeField } from '#~/concepts/connectionTypes/types';
import { toConnectionTypeConfigMap } from '#~/concepts/connectionTypes/utils';

describe('create', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableConnectionTypes: false,
      }),
    );
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        displayName: 'URI - v1',
        name: 'uri-v1',
        category: ['existing-category'],
        fields: [
          {
            type: 'uri',
            name: 'URI field test',
            envVar: 'URI',
            required: true,
            properties: {},
          },
        ],
      }),
    ]);
  });

  it('Can create connection type', () => {
    const categorySection = createConnectionTypePage.getCategorySection();
    createConnectionTypePage.visitCreatePage();

    createConnectionTypePage.findConnectionTypeName().should('exist');
    createConnectionTypePage.findConnectionTypeDesc().should('exist');
    createConnectionTypePage.findConnectionTypeEnableCheckbox().should('exist');
    createConnectionTypePage.findConnectionTypePreviewToggle().should('exist');

    createConnectionTypePage.findConnectionTypeName().should('have.value', '');
    createConnectionTypePage.findSubmitButton().should('be.disabled');

    createConnectionTypePage.findConnectionTypeName().type('hello');
    categorySection.findCategoryTable();
    categorySection.findMultiGroupSelectButton('existing-category').should('exist');
    categorySection.findMultiGroupSelectButton('Object-storage').click();
    createConnectionTypePage.findSubmitButton().should('be.enabled');

    categorySection.findMultiGroupInput().type('Database');
    categorySection.findMultiGroupSelectButton('Database').click();

    categorySection.findMultiGroupInput().type('New category');

    categorySection.findMultiGroupSelectButton('Option').click();
    categorySection.findChipItem('New category').should('exist');
    categorySection.findMultiGroupInput().type('{esc}');

    createConnectionTypePage
      .findModelServingCompatibleTypeDropdown()
      .findDropdownItem('URI')
      .click();
    createConnectionTypePage.findCompatibleModelServingTypesAlert().should('exist');
    createConnectionTypePage.getFieldsTableRow(0).findSectionHeading().should('exist');
    createConnectionTypePage
      .getFieldsTableRow(1)
      .findName()
      .should('contain.text', 'URI field test');

    createConnectionTypePage.findSubmitButton().should('be.enabled');
  });

  it('Shows creation error message when creation fails', () => {
    cy.interceptOdh('POST /api/connection-types', {
      success: false,
      error: 'returned error message',
    });
    const categorySection = createConnectionTypePage.getCategorySection();
    createConnectionTypePage.visitCreatePage();

    createConnectionTypePage.findConnectionTypeName().should('have.value', '');
    createConnectionTypePage.findSubmitButton().should('be.disabled');

    createConnectionTypePage.findConnectionTypeName().type('hello');
    categorySection.findCategoryTable();
    categorySection.findMultiGroupSelectButton('Object-storage').click();
    createConnectionTypePage.findSubmitButton().should('be.enabled').click();

    createConnectionTypePage.findFooterError().should('contain.text', 'returned error message');
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

    createConnectionTypePage.findSubmitButton().should('be.enabled');
    createConnectionTypePage
      .findConnectionTypeName()
      .should(
        'have.value',
        `Copy of ${
          existing.metadata.annotations?.['openshift.io/display-name'] || existing.metadata.name
        }`,
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
        envVar: 'short_text_1',
        required: false,
        properties: {},
      },
      {
        type: 'short-text',
        name: 'field2',
        envVar: 'short_text_2',
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

  it('should duplicate connection into create page', () => {
    cy.interceptOdh(
      'GET /api/connection-types/:name',
      { path: { name: 'existing' } },
      toConnectionTypeConfigMap(existing),
    );
    createConnectionTypePage.visitEditPage('existing');

    createConnectionTypePage.findConnectionTypeName().should('have.value', 'existing');
    createConnectionTypePage.findConnectionTypeDesc().fill('new description');
    createConnectionTypePage.findDuplicateConnectionTypeButton().click();

    cy.url().should('include', '/connectionTypes/duplicate/existing');

    createConnectionTypePage.findConnectionTypeName().should('have.value', 'Copy of existing');
    createConnectionTypePage.findConnectionTypeDesc().should('have.value', 'new description');
  });

  it('Drag and drop field rows in table', () => {
    cy.interceptOdh(
      'GET /api/connection-types/:name',
      { path: { name: 'existing' } },
      toConnectionTypeConfigMap(existing),
    );
    createConnectionTypePage.visitEditPage('existing');

    createConnectionTypePage.findSubmitButton().should('be.disabled');

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

    createConnectionTypePage.findSubmitButton().should('be.enabled');
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
            envVar: 'short_text_1',
            properties: {},
          },
          {
            type: 'section',
            name: 'header1',
          },
          {
            type: 'short-text',
            name: 'field2',
            envVar: 'short_text_2',
            properties: {},
          },
          {
            type: 'section',
            name: 'header2',
          },
          {
            type: 'short-text',
            name: 'field3',
            envVar: 'short_text_3',
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
