import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RuntimeCatalogDetailsView from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';
import type { RuntimeCatalogDetailsViewProps } from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';

const renderDetails = (props: Partial<RuntimeCatalogDetailsViewProps> = {}, runtimeId = '1') =>
  render(
    <MemoryRouter initialEntries={[`/catalog/${runtimeId}`]}>
      <Routes>
        <Route
          path="/catalog/:runtimeId"
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

const runtimeDetails = {
  id: '1',
  name: 'vllm',
  displayName: 'vLLM',
  description: 'GPU-accelerated serving for large language models.',
  supportedModelFormats: [{ name: 'safetensors' }, { name: 'huggingface' }],
  capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
};

const runtimeVersions = [
  {
    id: '102',
    name: 'vllm-0.6.0',
    artifactType: 'serving-runtime-version',
    version: '0.6.0',
    image: 'registry.example.com/mock/vllm:0.6.0',
    servingRuntimeTemplate: '{"kind":"ServingRuntime"}',
    llmInferenceServiceTemplate: '{"kind":"LLMInferenceServiceConfig"}',
  },
];

describe('RuntimeCatalogDetailsView', () => {
  it('should show a controlled load error instead of runtime details', () => {
    renderDetails({ error: new Error('Catalog service unavailable') });

    expect(
      screen.getByRole('heading', { name: 'Danger alert: Unable to load runtime image' }),
    ).toBeVisible();
    expect(screen.getByText('Catalog service unavailable')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });

  it('should show N/A for missing optional runtime details', () => {
    renderDetails(
      {
        runtimeDetails: {
          id: 'custom-runtime',
          name: 'Custom runtime',
          description: 'A runtime with limited catalog metadata',
        },
      },
      'custom-runtime',
    );

    expect(screen.getByRole('heading', { name: 'Custom runtime' })).toBeInTheDocument();
    expect(screen.getByText('A runtime with limited catalog metadata')).toBeInTheDocument();
    expect(screen.getAllByRole('definition').map((definition) => definition.textContent)).toEqual([
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
    ]);
    expect(screen.queryByTestId('runtime-container-image-copy')).not.toBeInTheDocument();
    expect(screen.queryByText(runtimeDetails.description)).not.toBeInTheDocument();
  });

  it('should render both configuration tabs from the latest BFF version', () => {
    renderDetails({ runtimeDetails, runtimeVersions });

    expect(screen.getByText('0.6.0')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('runtime-container-image-copy')).getByRole('textbox'),
    ).toHaveValue('registry.example.com/mock/vllm:0.6.0');
    expect(screen.getByTestId('runtime-serving-runtime-panel')).toHaveTextContent(
      'kind: ServingRuntime',
    );
    expect(screen.getByTestId('runtime-llm-inference-service-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('runtime-llm-inference-service-tab'));

    expect(screen.getByTestId('runtime-llm-inference-service-panel')).toHaveTextContent(
      'kind: LLMInferenceServiceConfig',
    );
  });

  it('should hide unavailable configurations when the BFF version has no templates', () => {
    renderDetails({
      runtimeDetails,
      runtimeVersions: [
        { ...runtimeVersions[0], servingRuntimeTemplate: '', llmInferenceServiceTemplate: '' },
      ],
    });

    expect(
      screen.queryByRole('heading', { name: 'Available configurations' }),
    ).not.toBeInTheDocument();
  });

  it('should activate the LLM tab when it is the only configuration', () => {
    renderDetails({
      runtimeDetails,
      runtimeVersions: [{ ...runtimeVersions[0], servingRuntimeTemplate: '' }],
    });

    expect(screen.queryByTestId('runtime-serving-runtime-tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('runtime-llm-inference-service-panel')).toHaveTextContent(
      'kind: LLMInferenceServiceConfig',
    );
  });

  it('should show a loading state before runtime details', () => {
    renderDetails({ loading: true });

    expect(screen.getByLabelText('Loading runtime image')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });

  it('should show the not-found state for a missing runtime ID', () => {
    renderDetails({}, 'unknown-runtime');

    expect(screen.getByRole('heading', { name: 'Runtime image not found' })).toBeInTheDocument();
    expect(screen.getByText('The selected runtime image is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });
});
