import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    properties: { 'data-domain': 'claims' },
  },
  {
    name: 'raw-documents',
    description: 'PDF documents',
    format: 'documents',
    assetType: 'volume',
    location: 's3://bucket/docs',
    connectionRef: '',
    labels: ['source-docs'],
    collection: 'guidelines',
    properties: { 'retention-class': 'long-term' },
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
        project="test-project"
        onManageCollections={jest.fn()}
        onManageLabels={jest.fn()}
        onRegisterData={jest.fn()}
        onRetry={jest.fn()}
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
    expect(screen.getByText('Apache Parquet')).toBeTruthy();
    expect(screen.getByText('Documents')).toBeTruthy();
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
  });

  it('should show the empty state image, description, and register action when no assets', () => {
    renderTable({ assets: [] });
    expect(screen.getByTestId('registry-empty-state')).toBeTruthy();
    expect(screen.getByTestId('registry-empty-state-image')).toBeTruthy();
    expect(screen.getByTestId('registry-empty-state-description')).toHaveTextContent(
      'Data assets point to the exact location within a connection where information is located, and can be used across workbenches and pipelines in your project. To get started, create a data asset.',
    );
    expect(screen.getByTestId('registry-toolbar')).toHaveClass('pf-v6-u-display-none');
    expect(screen.queryByRole('columnheader', { name: 'Name' })).toBeNull();
    expect(screen.getByTestId('empty-register-data-button')).toBeTruthy();
  });

  it('should show the filtered empty state when filters match no assets', () => {
    renderTable();
    fireEvent.change(screen.getByTestId('asset-search').querySelector('input')!, {
      target: { value: 'missing' },
    });

    expect(screen.getByText('No assets found')).toBeTruthy();
    expect(screen.getByText('Try adjusting your filters.')).toBeTruthy();
    expect(screen.queryByTestId('registry-empty-state-description')).toBeNull();
  });

  it('should render filter dropdowns', () => {
    renderTable();
    expect(screen.getByTestId('filter-category')).toBeTruthy();
    expect(screen.getByTestId('filter-value')).toBeTruthy();
    expect(screen.getByTestId('asset-search')).toBeTruthy();
    expect(screen.getByTestId('register-data-button')).toBeTruthy();
  });

  it('should show a disabled empty state when no labels are available', () => {
    renderTable({ labels: [] });

    fireEvent.click(screen.getByTestId('filter-value'));

    const emptyOption = screen.getByRole('option', { name: 'No labels found.' });
    expect(emptyOption).toBeDisabled();
  });

  it('should allow selecting multiple formats', () => {
    renderTable();

    fireEvent.click(screen.getByTestId('filter-category'));
    fireEvent.click(screen.getByRole('option', { name: 'Format' }));
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apache Parquet' }));

    expect(screen.getByText('claims-data')).toBeInTheDocument();
    expect(screen.queryByText('raw-documents')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Documents' }));

    expect(screen.getByText('claims-data')).toBeInTheDocument();
    expect(screen.getByText('raw-documents')).toBeInTheDocument();
    expect(screen.getByTestId('filter-value')).toHaveTextContent('2');
  });

  it('should use OR within categories and AND across categories', () => {
    renderTable();

    // Labels use OR: either selected label matches.
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'production' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'source-docs' }));
    expect(screen.getByText('claims-data')).toBeInTheDocument();
    expect(screen.getByText('raw-documents')).toBeInTheDocument();

    // Asset type uses OR: either selected type matches.
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByTestId('filter-category'));
    fireEvent.click(screen.getByRole('option', { name: 'Asset type' }));
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Structured' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unstructured' }));
    expect(screen.getByText('claims-data')).toBeInTheDocument();
    expect(screen.getByText('raw-documents')).toBeInTheDocument();

    // Categories use AND: the remaining source-docs label narrows both asset types.
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByTestId('filter-category'));
    fireEvent.click(screen.getByRole('option', { name: 'Labels' }));
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'production' }));
    expect(screen.queryByText('claims-data')).toBeNull();
    expect(screen.getByText('raw-documents')).toBeInTheDocument();

    // Formats use OR while remaining combined with the label and asset type filters.
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByTestId('filter-category'));
    fireEvent.click(screen.getByRole('option', { name: 'Format' }));
    fireEvent.click(screen.getByTestId('filter-value'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apache Parquet' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Documents' }));
    expect(screen.queryByText('claims-data')).toBeNull();
    expect(screen.getByText('raw-documents')).toBeInTheDocument();
  });

  it('should filter assets by property key and value', () => {
    renderTable();

    fireEvent.change(screen.getByTestId('asset-search').querySelector('input')!, {
      target: { value: 'retention-class' },
    });

    expect(screen.getByText('raw-documents')).toBeTruthy();
    expect(screen.queryByText('claims-data')).toBeNull();
  });

  it('should render kebab menu', () => {
    renderTable();
    expect(screen.getByTestId('registry-kebab')).toBeTruthy();
  });
});
