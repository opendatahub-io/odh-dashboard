import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RuntimeCatalogDetailsView from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';
import type { RuntimeCatalogDetailsViewProps } from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';

const renderDetails = (
  props: Partial<RuntimeCatalogDetailsViewProps> = {},
  runtimeName = 'catalog-vllm-0-6-2',
) =>
  render(
    <MemoryRouter initialEntries={[`/catalog/${runtimeName}`]}>
      <Routes>
        <Route
          path="/catalog/:runtimeName"
          element={
            <RuntimeCatalogDetailsView
              breadcrumbs={[{ title: 'Runtime image library', href: '/catalog' }]}
              {...props}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('RuntimeCatalogDetailsView', () => {
  it('should show a controlled load error instead of runtime details', () => {
    renderDetails({ error: new Error('Catalog service unavailable') });

    expect(
      screen.getByRole('heading', { name: 'Danger alert: Unable to load runtime image' }),
    ).toBeVisible();
    expect(screen.getByText('Catalog service unavailable')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'CUDA vLLM 0.6.2' })).not.toBeInTheDocument();
  });

  it('should show N/A for missing optional runtime details without using the sample data', () => {
    renderDetails(
      {
        runtimeDetails: {
          id: 'custom-runtime',
          name: 'Custom runtime',
          description: 'A runtime with limited catalog metadata',
          version: '1.0',
          image: '',
        },
      },
      'custom-runtime',
    );

    expect(screen.getByRole('heading', { name: 'Custom runtime' })).toBeInTheDocument();
    expect(screen.getByText('A runtime with limited catalog metadata')).toBeInTheDocument();
    expect(screen.getAllByRole('definition').map((definition) => definition.textContent)).toEqual([
      '1.0',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
    ]);
    expect(screen.queryByTestId('runtime-container-image-copy')).not.toBeInTheDocument();
    expect(screen.queryByText('A GPU runtime for vLLM model serving')).not.toBeInTheDocument();
  });

  it('should show a loading state before runtime details', () => {
    renderDetails({ loading: true });

    expect(screen.getByLabelText('Loading runtime image')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CUDA vLLM 0.6.2' })).not.toBeInTheDocument();
  });

  it('should show the not-found state for a missing runtime ID', () => {
    renderDetails({}, 'unknown-runtime');

    expect(screen.getByRole('heading', { name: 'Runtime image not found' })).toBeInTheDocument();
    expect(screen.getByText('The selected runtime image is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CUDA vLLM 0.6.2' })).not.toBeInTheDocument();
  });
});
