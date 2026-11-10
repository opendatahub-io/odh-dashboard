/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import {
  DATA_REGISTRY_CYPRESS_TRACK_EVENT,
  DATA_REGISTRY_CYPRESS_TRACKING_QUERY,
} from '~/app/utilities/tracking';

const REGISTRY_API = '/data-registry/api/v1';
const MAIN_API = '/data-registry/api/v1';

const mockAssetsResponse = {
  assets: [
    {
      name: 'claims-data',
      asset_type: 'table',
      uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      format: 'parquet',
      storage_location: 's3://bucket/claims',
      description: 'Claims processing data',
      labels: ['production', 'claims'],
      properties: { 'data-domain': 'claims' },
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    },
    {
      name: 'embeddings',
      asset_type: 'table',
      uuid: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
      format: 'milvus',
      storage_location: 'milvus://embeddings',
      description: 'Vector embeddings',
      labels: ['embeddings', 'production'],
      properties: { 'data-domain': 'vector-search' },
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      created_at: '2026-01-02',
      updated_at: '2026-01-03',
    },
  ],
};

const mockVolumesResponse = {
  volumes: [
    {
      name: 'raw-docs',
      asset_type: 'volume',
      uuid: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
      format: 'documents',
      storage_location: 's3://bucket/docs',
      collection: 'analytics',
      connection_ref: null,
      description: 'PDF documents',
      owner: 'user1',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      labels: ['source-docs'],
      properties: { 'retention-class': 'long-term' },
    },
  ],
};

const mockConnectionsResponse = [
  { name: 'my-s3-connection', displayName: 'My S3 Connection', connectionType: 's3' },
];

type TrackingEvent = {
  eventName: string;
  properties: Record<string, string | number | boolean | string[] | undefined>;
};

const initIntercepts = () => {
  cy.intercept('GET', `${MAIN_API}/user`, {
    body: mockModArchResponse(mockUserSettings({ userId: 'test-user' })),
  });
  cy.intercept('GET', `${MAIN_API}/namespaces`, {
    body: mockModArchResponse([
      mockNamespace({ name: 'test-project' }),
      mockNamespace({ name: 'other-project' }),
    ]),
  });
  cy.intercept('GET', `${REGISTRY_API}/other-project/namespaces`, {
    body: { namespaces: [['default']] },
  });
  cy.intercept('GET', `${REGISTRY_API}/other-project/namespaces/default`, {
    body: { namespace: ['default'], properties: {} },
  });
  cy.intercept('GET', `${REGISTRY_API}/other-project/namespaces/*/generic-tables`, {
    body: { assets: [] },
  });
  cy.intercept('GET', `${REGISTRY_API}/other-project/namespaces/*/volumes`, {
    body: { volumes: [] },
  });
  cy.intercept('GET', `${REGISTRY_API}/other-project/labels`, {
    body: { labels: [] },
  });
  cy.intercept('GET', `${MAIN_API}/connections/other-project`, {
    body: mockModArchResponse([]),
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces`, {
    body: { namespaces: [['analytics'], ['default']] },
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/analytics`, {
    body: { namespace: ['analytics'], properties: { description: 'analytics collection' } },
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default`, {
    body: { namespace: ['default'], properties: { description: 'default collection' } },
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/*/generic-tables`, {
    body: mockAssetsResponse,
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/*/volumes`, {
    body: mockVolumesResponse,
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default/generic-tables`, {
    body: { assets: [] },
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default/volumes`, {
    body: { volumes: [] },
  });
  cy.intercept('GET', `${REGISTRY_API}/test-project/labels`, {
    body: { labels: ['production', 'claims', 'embeddings', 'source-docs'] },
  });
  cy.intercept('GET', `${MAIN_API}/connections/test-project`, {
    body: mockModArchResponse(mockConnectionsResponse),
  });
};

const visitWithData = () => {
  cy.visit(`/ai-hub/data/browse?project=test-project&${DATA_REGISTRY_CYPRESS_TRACKING_QUERY}=true`);
  cy.findByTestId('registry-table', { timeout: 15000 }).should('exist');
};

const captureTrackingEvents = (): TrackingEvent[] => {
  const events: TrackingEvent[] = [];

  cy.window().then((window) => {
    window.addEventListener(DATA_REGISTRY_CYPRESS_TRACK_EVENT, (event) => {
      events.push((event as CustomEvent<TrackingEvent>).detail);
    });
  });

  return events;
};

describe('Data Registry event tracking', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('tracks only a real project switch, not initial or repeated selection', () => {
    const events: TrackingEvent[] = [];
    cy.visit(
      `/ai-hub/data/browse?project=test-project&${DATA_REGISTRY_CYPRESS_TRACKING_QUERY}=true`,
      {
        onBeforeLoad: (window) => {
          window.addEventListener(DATA_REGISTRY_CYPRESS_TRACK_EVENT, (event) => {
            events.push((event as CustomEvent<TrackingEvent>).detail);
          });
        },
      },
    );
    cy.findByTestId('registry-table', { timeout: 15000 }).should('exist');
    cy.then(() => {
      expect(events.filter((event) => event.eventName === 'Data Project Switched')).to.have.length(
        0,
      );
    });

    cy.findByTestId('project-selector-toggle').click();
    cy.findByRole('menuitem', { name: 'other-project' }).click();
    cy.url().should('include', 'project=other-project');
    cy.then(() => {
      expect(events.filter((event) => event.eventName === 'Data Project Switched')).to.deep.equal([
        {
          eventName: 'Data Project Switched',
          properties: { previousProject: 'test-project', selectedProject: 'other-project' },
        },
      ]);
    });

    cy.findByTestId('project-selector-toggle').click();
    cy.findByRole('menuitem', { name: 'other-project' }).click();
    cy.then(() => {
      expect(events.filter((event) => event.eventName === 'Data Project Switched')).to.have.length(
        1,
      );
    });
  });

  it('tracks a debounced search with the total result count and no raw query', () => {
    visitWithData();
    const events = captureTrackingEvents();
    cy.clock();

    cy.findByTestId('asset-search').find('input').type('claims');
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('not.exist');
    cy.tick(750);

    cy.then(() => {
      expect(events).to.deep.include({
        eventName: 'Data Registry Search Performed',
        properties: {
          hasQuery: true,
          queryLength: 6,
          resultCount: 1,
          project: 'test-project',
        },
      });
      expect(
        events.find((event) => event.eventName === 'Data Registry Search Performed')?.properties,
      ).not.to.have.property('query');
    });
  });

  it('tracks opening an asset without including its name', () => {
    visitWithData();
    const events = captureTrackingEvents();

    cy.findByRole('link', { name: 'claims-data' }).click();
    cy.url().should(
      'include',
      '/ai-hub/data/browse/assets/table/test-project/analytics/claims-data',
    );

    cy.then(() => {
      expect(events).to.deep.include({
        eventName: 'Data Asset Opened',
        properties: { project: 'test-project' },
      });
      expect(
        events.find((event) => event.eventName === 'Data Asset Opened')?.properties,
      ).not.to.have.property('assetName');
    });
  });

  it('tracks registration start and the two cancellation methods without sending form values', () => {
    visitWithData();
    const events = captureTrackingEvents();

    cy.findByTestId('register-data-button').click();
    cy.findByTestId('register-data-modal').should('be.visible');
    cy.findByRole('button', { name: 'Cancel' }).click();
    cy.findByTestId('register-data-modal').should('not.exist');

    cy.findByTestId('register-data-button').click();
    cy.findByTestId('register-data-modal').should('be.visible');
    cy.findByRole('button', { name: 'Close' }).click();

    cy.then(() => {
      expect(events).to.deep.include({
        eventName: 'Data Registration Started',
        properties: { project: 'test-project' },
      });
      expect(events).to.deep.include({
        eventName: 'Data Registration Canceled',
        properties: { cancelMethod: 'cancel_button', project: 'test-project' },
      });
      expect(events).to.deep.include({
        eventName: 'Data Registration Canceled',
        properties: { cancelMethod: 'close_x', project: 'test-project' },
      });
      expect(
        events.filter((event) => event.eventName === 'Data Registration Started'),
      ).to.have.length(2);
      expect(
        events.filter((event) => event.eventName === 'Data Registration Canceled'),
      ).to.have.length(2);
    });
  });
});
