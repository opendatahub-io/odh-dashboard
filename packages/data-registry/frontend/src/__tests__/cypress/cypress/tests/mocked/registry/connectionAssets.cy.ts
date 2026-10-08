/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { mockDchConnection } from '~/__mocks__/mockConnection';
import { connectionAssets } from '~/__tests__/cypress/cypress/pages/connectionAssets';
import { editAssetModal } from '~/__tests__/cypress/cypress/pages/editAssetModal';

const API = '/data-registry/api/v1';
const original = mockDchConnection();
const replacement = mockDchConnection({ id: '550e8400-e29b-41d4-a716-446655440002' });

(['table', 'volume'] as const).forEach((kind) => {
  describe(`${kind} connection references`, () => {
    const assetURL = `${API}/test-project/namespaces/analytics/${
      kind === 'table' ? 'generic-tables' : 'volumes'
    }/asset-a`;
    const method = 'PATCH';
    const asset =
      kind === 'table'
        ? mockAssetResponse({ name: 'asset-a', connection_ref: { type: 'dch', id: original.id } })
        : mockVolumeInfo({ name: 'asset-a', connection_ref: { type: 'dch', id: original.id } });

    beforeEach(() => {
      cy.intercept('GET', `${API}/user`, { body: mockModArchResponse(mockUserSettings({})) });
      cy.intercept('GET', `${API}/namespaces`, {
        body: mockModArchResponse([mockNamespace({ name: 'test-project' })]),
      });
      cy.intercept('GET', `${API}/test-project/labels`, { body: { labels: [] } });
      cy.intercept('GET', assetURL, { body: asset }).as('getAsset');
      cy.intercept('GET', `${API}/connections/test-project`, {
        body: { data: [original, replacement] },
      }).as('getConnections');
    });

    it('should replace the correct reference when labels are duplicated and refresh before saving', () => {
      connectionAssets.visit(kind);
      cy.wait('@getConnections');
      connectionAssets.findConnection().should('contain.text', 'Production data');
      connectionAssets.edit();
      cy.wait('@getConnections');
      editAssetModal.findConnectionToggle().click();
      connectionAssets
        .findConnectionOption(`dch:${replacement.id}`)
        .should('contain.text', 'Production data')
        .and('contain.text', 's3');
      connectionAssets.selectConnection(`dch:${replacement.id}`);
      cy.intercept(method, assetURL, { body: asset }).as('updateAsset');
      editAssetModal.findSaveButton().click();
      cy.wait('@getConnections');
      cy.wait('@updateAsset')
        .its('request.body.connection_ref')
        .should('deep.equal', { type: 'dch', id: replacement.id });
    });

    it('should use the current name when reopened', () => {
      connectionAssets.visit(kind);
      cy.wait('@getConnections');
      cy.intercept('GET', `${API}/connections/test-project`, {
        body: { data: [{ ...original, name: 'Archive data' }] },
      }).as('renamedConnections');
      connectionAssets.visit(kind);
      cy.wait('@renamedConnections');
      connectionAssets.findConnection().should('contain.text', 'Archive data');
    });

    it('should preserve the saved reference while lookup is forbidden', () => {
      cy.intercept('GET', `${API}/connections/test-project`, {
        statusCode: 403,
        body: { error: { code: '403', message: 'Access forbidden' } },
      }).as('deniedConnections');
      connectionAssets.visit(kind);
      connectionAssets.findConnection().should('contain.text', 'Connection unavailable');
      connectionAssets.edit();
      connectionAssets.findLookupError().should('be.visible');
      editAssetModal.findConnectionToggle().should('contain.text', 'Connection unavailable');
      editAssetModal.findDescriptionInput().clear().type('Updated description');
      cy.intercept(method, assetURL, { body: asset }).as('updateAsset');
      editAssetModal.findSaveButton().click();
      cy.wait('@updateAsset').its('request.body').should('not.have.property', 'connection_ref');
    });
  });
});
