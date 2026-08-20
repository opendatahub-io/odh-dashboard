import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistryTable from '~/app/components/RegistryTable';
import { RegistryAsset } from '~/app/hooks/useAssets';

const mockAssets: RegistryAsset[] = [
  {
    name: 'claims-data',
    description: 'Claims processing data',
    format: 'parquet',
    assetType: 'table',
    location: 's3://bucket/claims',
    connectionRef: 'minio-connection',
    labels: ['production', 'claims'],
    collection: 'analytics',
  },
  {
    name: 'raw-documents',
    description: 'PDF documents',
    format: 'application/pdf',
    assetType: 'volume',
    location: 's3://bucket/docs',
    connectionRef: '',
    labels: ['source-docs'],
    collection: 'guidelines',
  },
];

const mockLabels = ['production', 'claims', 'source-docs'];

const renderTable = (props?: Partial<React.ComponentProps<typeof RegistryTable>>) =>
  render(
    <MemoryRouter>
      <RegistryTable
        assets={mockAssets}
        loaded
        error={undefined}
        labels={mockLabels}
        onManageCollections={jest.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe('RegistryTable', () => {
  it('should render asset names', () => {
    renderTable();
    expect(screen.getByText('claims-data')).toBeTruthy();
    expect(screen.getByText('raw-documents')).toBeTruthy();
  });

  it('should render format badges', () => {
    renderTable();
    expect(screen.getByText('parquet')).toBeTruthy();
    expect(screen.getByText('application/pdf')).toBeTruthy();
  });

  it('should render labels', () => {
    renderTable();
    expect(screen.getByText('production')).toBeTruthy();
    expect(screen.getByText('claims')).toBeTruthy();
    expect(screen.getByText('source-docs')).toBeTruthy();
  });

  it('should show loading state', () => {
    renderTable({ loaded: false });
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('should show error state', () => {
    renderTable({ error: new Error('Failed to load'), loaded: true });
    expect(screen.getByText('Error loading assets')).toBeTruthy();
    expect(screen.getByText('Failed to load')).toBeTruthy();
  });

  it('should show empty state when no assets', () => {
    renderTable({ assets: [] });
    expect(screen.getByText('No assets found')).toBeTruthy();
  });

  it('should render filter dropdowns', () => {
    renderTable();
    expect(screen.getByTestId('filter-category')).toBeTruthy();
    expect(screen.getByTestId('filter-value')).toBeTruthy();
    expect(screen.getByTestId('asset-search')).toBeTruthy();
  });

  it('should render kebab menu', () => {
    renderTable();
    expect(screen.getByTestId('registry-kebab')).toBeTruthy();
  });
});
