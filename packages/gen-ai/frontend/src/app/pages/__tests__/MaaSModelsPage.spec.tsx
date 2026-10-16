/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockMaaSModel } from '~/__mocks__/mockMaaSModel';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import MaaSModelsPage from '~/app/pages/MaaSModelsPage';

jest.mock('~/app/hooks/useFetchMaaSModels');
jest.mock('~/app/hooks/useChatPlaygroundEnabled', () => ({
  __esModule: true,
  default: () => true,
}));
jest.mock('~/app/hooks/useAiAssetVectorStoresEnabled', () => ({
  __esModule: true,
  default: () => false,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <MaaSModelsPage />
    </MemoryRouter>,
  );

describe('MaaSModelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetchMaaSModels).mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should show the MaaS title and description without tabs or a namespace selector', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'MaaS Models' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Browse the Models-as-a-Service endpoints available through your subscriptions.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByTestId('namespace-selector')).not.toBeInTheDocument();
  });

  it('should show loading feedback', () => {
    jest.mocked(useFetchMaaSModels).mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId('maas-models-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('maas-models-empty')).not.toBeInTheDocument();
  });

  it('should show a subscription-specific empty state', () => {
    renderPage();
    expect(screen.getByTestId('maas-models-empty')).toHaveTextContent('No MaaS models available');
    expect(screen.queryByTestId('ai-models-table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /deploy/i })).not.toBeInTheDocument();
  });

  it('should show API errors before loading feedback and allow retrying', () => {
    const refresh = jest.fn();
    jest.mocked(useFetchMaaSModels).mockReturnValue({
      data: [],
      loaded: false,
      error: new Error('Request failed'),
      refresh,
    });
    renderPage();
    expect(screen.getByTestId('maas-models-error')).toHaveTextContent('Unable to load MaaS models');
    expect(screen.queryByTestId('maas-models-loading')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('maas-models-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should reuse the models table without playground actions or model-status help', () => {
    jest.mocked(useFetchMaaSModels).mockReturnValue({
      data: [mockMaaSModel(), mockMaaSModel({ model_id: 'granite', display_name: 'Granite' })].map(
        convertMaaSModelToAIModel,
      ),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId('ai-models-table')).toHaveTextContent('Llama 3');
    expect(screen.getByTestId('ai-models-table')).toHaveTextContent('Granite');
    expect(screen.queryByRole('columnheader', { name: 'Playground' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('try-playground-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dont-see-model-button')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('endpoint-view-button')).toHaveLength(2);
  });
});
