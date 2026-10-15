/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TableDetailView from '~/app/pages/TableDetailView';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { mockRhaiConnection } from '~/__mocks__/mockConnection';
import type { AssetResponse, ConnectionModel } from '~/app/types';

const renderView = (
  asset: AssetResponse,
  project = 'test-project',
  connections: ConnectionModel[] = [],
  connectionsLoaded = true,
) =>
  render(
    <MemoryRouter>
      <TableDetailView
        asset={asset}
        project={project}
        connections={connections}
        connectionsLoaded={connectionsLoaded}
      />
    </MemoryRouter>,
  );

describe('TableDetailView', () => {
  it('should render data details card with metadata fields', () => {
    const asset = mockAssetResponse();
    renderView(asset);

    expect(screen.getByTestId('data-details-card')).toBeTruthy();
    expect(screen.getByTestId('asset-name')).toHaveTextContent('test-table');
    expect(screen.getByTestId('asset-description')).toHaveTextContent(
      'A test table for unit testing',
    );
    expect(screen.getByTestId('asset-format')).toHaveTextContent('Apache Parquet');
    expect(screen.getByTestId('asset-collection')).toHaveTextContent('default');
    expect(screen.getByTestId('asset-location')).toHaveTextContent(
      's3://my-bucket/data/test-table/',
    );
    expect(screen.getByTestId('asset-owner')).toHaveTextContent('data-team');
    expect(screen.getByTestId('asset-type')).toHaveTextContent('Structured');
  });

  it('should render collection as a link when project is provided', () => {
    const asset = mockAssetResponse();
    renderView(asset);

    const collectionElement = screen.getByTestId('asset-collection');
    const link = collectionElement.querySelector('a');
    expect(link).toBeTruthy();
    expect(link).toHaveTextContent('default');
  });

  it('should render connection name as a link to project connections', () => {
    const asset = mockAssetResponse();
    renderView(asset, 'test-project', [
      mockRhaiConnection({ secret_name: 'my-s3-connection', name: 'My S3 Connection' }),
    ]);
    const el = screen.getByTestId('connection-ref-link');
    expect(el).toHaveTextContent('My S3 Connection');
    expect(el).toHaveAttribute('href', '/projects/test-project?section=connections');
  });

  it('should show unavailable when the connection has no display name', () => {
    const asset = mockAssetResponse();
    renderView(asset, 'test-project', [
      mockRhaiConnection({ secret_name: 'my-s3-connection', name: undefined }),
    ]);

    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
    expect(screen.queryByTestId('connection-ref-link')).not.toBeInTheDocument();
  });

  it('should render the connection type below the connection name', () => {
    const asset = mockAssetResponse();
    renderView(asset, 'test-project', [
      mockRhaiConnection({ secret_name: 'my-s3-connection', connectionType: 's3' }),
    ]);

    expect(screen.getByTestId('connection-type')).toHaveTextContent('s3');
  });

  it('should render a location without a link when no connection is specified', () => {
    const asset = mockAssetResponse({
      connection_ref: null,
      storage_location: 's3://bucket/path',
    });
    renderView(asset);

    expect(screen.getByTestId('asset-connection')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-location')).toHaveTextContent('s3://bucket/path');
    expect(screen.queryByTestId('connection-ref-link')).not.toBeInTheDocument();
  });

  it('should render relative created and last modified timestamps with hover details', () => {
    const asset = mockAssetResponse();
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-08-21T14:45:00Z').getTime());

    try {
      renderView(asset);

      expect(screen.getByTestId('asset-created-at')).toHaveTextContent('1 month ago');
      expect(screen.getByTestId('asset-updated-at')).toHaveTextContent('1 day ago');
      expect(screen.getByTestId('asset-created-at')).not.toHaveTextContent('View timestamp');
      expect(screen.getByTestId('asset-updated-at')).not.toHaveTextContent('View timestamp');
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('should render labels card with expandable label group', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('labels-card')).toBeTruthy();
    expect(screen.getByText('production')).toBeTruthy();
    expect(screen.getByText('analytics')).toBeTruthy();
  });

  it('should render "No labels" when labels are empty', () => {
    const asset = mockAssetResponse({ labels: [] });
    renderView(asset);
    expect(screen.getByTestId('asset-labels')).toHaveTextContent('No labels');
  });

  it('should render properties below data details with well-known properties first', () => {
    renderView(
      mockAssetResponse({
        properties: {
          source: 'etl-pipeline',
          purpose: 'ML training',
          'data.quality': 'verified',
        },
      }),
    );
    expect(screen.getByTestId('properties-card')).toBeTruthy();
    expect(screen.getByTestId('asset-property-purpose')).toHaveTextContent('PurposeML training');
    expect(screen.getByTestId('asset-property-data.quality')).toHaveTextContent('verified');
    expect(screen.getByTestId('asset-property-source')).toHaveTextContent('etl-pipeline');

    const propertyGroups = Array.from(
      screen.getByTestId('asset-properties').querySelectorAll('dt'),
    ).map((term) => term.textContent);
    expect(propertyGroups).toEqual(['Purpose', 'source', 'data.quality']);
  });

  it('should render custom properties whose names match Object prototype keys', () => {
    const properties = JSON.parse(
      '{"constructor":"constructor value","toString":"toString value","purpose":"ML training"}',
    ) as Record<string, string>;
    renderView(mockAssetResponse({ properties }));

    expect(screen.getByTestId('asset-property-purpose')).toHaveTextContent('PurposeML training');
    expect(screen.getByTestId('asset-property-constructor')).toHaveTextContent(
      'constructorconstructor value',
    );
    expect(screen.getByTestId('asset-property-toString')).toHaveTextContent(
      'toStringtoString value',
    );
  });

  it('should render schema card with columns table', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('schema-card')).toBeTruthy();
    expect(screen.queryByTestId('schema-column-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('schema-columns-table')).toBeTruthy();
    expect(screen.getByTestId('schema-column-name-id')).toHaveTextContent('id');
  });

  it('should render schema column types as labels', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('schema-column-type-id')).toHaveTextContent('integer');
    expect(screen.getByTestId('schema-column-type-name')).toHaveTextContent('string');
  });

  it('should render an unstructured volume with its human-readable format', () => {
    const asset = mockVolumeInfo({
      format: 'documents',
      columns: [],
      properties: { 'content-type': 'application/pdf' },
    });
    renderView(asset);

    expect(screen.getByTestId('asset-type')).toHaveTextContent('Unstructured');
    expect(screen.getByTestId('asset-format')).toHaveTextContent('Documents');
    expect(screen.getByTestId('asset-property-content-type')).toHaveTextContent(
      'content-typeapplication/pdf',
    );
    expect(screen.queryByTestId('schema-card')).not.toBeInTheDocument();
    expect(screen.getAllByText('Created')).toHaveLength(1);
    expect(screen.getAllByText('Last modified')).toHaveLength(1);
  });

  it('should render dash for missing optional fields', () => {
    const asset = mockAssetResponse({
      description: undefined,
      storage_location: undefined,
      owner: undefined,
      labels: [],
      properties: undefined,
      created_at: undefined,
      updated_at: undefined,
    });
    renderView(asset);

    expect(screen.getByTestId('asset-format')).toHaveTextContent('Apache Parquet');
    expect(screen.getByTestId('asset-description')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-location')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-owner')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-labels')).toHaveTextContent('No labels');
    expect(screen.getByTestId('asset-created-at')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-updated-at')).toHaveTextContent('-');
    expect(screen.queryByTestId('properties-card')).not.toBeInTheDocument();
  });
  it('should hide schema card when no columns', () => {
    const asset = mockAssetResponse({ columns: [] });
    renderView(asset);
    expect(screen.queryByTestId('schema-card')).not.toBeInTheDocument();
  });
});
