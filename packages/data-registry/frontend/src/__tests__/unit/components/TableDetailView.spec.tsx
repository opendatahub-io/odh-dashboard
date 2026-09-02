/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TableDetailView from '~/app/pages/TableDetailView';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';

const renderView = (asset: ReturnType<typeof mockAssetResponse>, project = 'test-project') =>
  render(
    <MemoryRouter>
      <TableDetailView asset={asset} project={project} />
    </MemoryRouter>,
  );

describe('TableDetailView', () => {
  it('should render data details card with metadata fields', () => {
    const asset = mockAssetResponse();
    renderView(asset);

    expect(screen.getByTestId('data-details-card')).toBeTruthy();
    expect(screen.getByTestId('asset-description')).toHaveTextContent(
      'A test table for unit testing',
    );
    expect(screen.getByTestId('asset-format')).toHaveTextContent('parquet');
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

  it('should render connection name without prefix', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('connection-ref-rhai')).toHaveTextContent('my-s3-connection');
    expect(screen.getByTestId('connection-ref-rhai').textContent).not.toContain('Connection:');
  });

  it('should render created and last modified with user attribution', () => {
    const asset = mockAssetResponse();
    renderView(asset);

    expect(screen.getByTestId('asset-created-at')).toHaveTextContent('by user@example.com');
    expect(screen.getByTestId('asset-updated-at')).toHaveTextContent('by admin@example.com');
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

  it('should render properties card with key:value labels', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('properties-card')).toBeTruthy();
    expect(screen.getByText('data.quality: verified')).toBeTruthy();
    expect(screen.getByText('source: etl-pipeline')).toBeTruthy();
  });

  it('should render schema card with column count and columns table', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('schema-card')).toBeTruthy();
    expect(screen.getByTestId('schema-column-count')).toHaveTextContent('3 columns');
    expect(screen.getByTestId('schema-columns-table')).toBeTruthy();
    expect(screen.getByTestId('schema-column-name-id')).toHaveTextContent('id');
  });

  it('should render schema column types as labels', () => {
    const asset = mockAssetResponse();
    renderView(asset);
    expect(screen.getByTestId('schema-column-type-id')).toHaveTextContent('integer');
    expect(screen.getByTestId('schema-column-type-name')).toHaveTextContent('string');
  });

  it('should hide format field when format is not set', () => {
    const asset = mockAssetResponse({ format: undefined });
    renderView(asset);
    expect(screen.queryByTestId('asset-format')).not.toBeInTheDocument();
    expect(screen.getByTestId('asset-type')).toHaveTextContent('table');
  });

  it('should render dash for missing optional fields', () => {
    const asset = mockAssetResponse({
      format: undefined,
      description: undefined,
      location: undefined,
      owner: undefined,
      labels: [],
      properties: undefined,
      created_at: undefined,
      updated_at: undefined,
    });
    renderView(asset);

    expect(screen.queryByTestId('asset-format')).not.toBeInTheDocument();
    expect(screen.getByTestId('asset-description')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-location')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-owner')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-labels')).toHaveTextContent('No labels');
    expect(screen.getByTestId('asset-created-at')).toHaveTextContent('-');
    expect(screen.getByTestId('asset-updated-at')).toHaveTextContent('-');
    expect(screen.queryByTestId('properties-card')).not.toBeInTheDocument();
  });

  it('should render empty schema columns state when no columns', () => {
    const asset = mockAssetResponse({ columns: [] });
    renderView(asset);
    expect(screen.getByText('No schema columns')).toBeTruthy();
  });
});
