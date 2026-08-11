import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import RoutingConfigurationsView from '../RoutingConfigurationsView';
import { RoutingConfigContext } from '../RoutingConfigContext';
import type { LLMInferenceServiceConfigKind } from '../../../types';

jest.mock('../RoutingConfigurationsTable', () => ({
  __esModule: true,
  default: () => <div data-testid="routing-configurations-table">Table</div>,
}));

jest.mock('../EmptyRoutingConfigurations', () => ({
  __esModule: true,
  default: () => <div data-testid="empty-routing-configurations">Empty</div>,
}));

const renderView = (configs: LLMInferenceServiceConfigKind[], noTitle?: boolean) =>
  render(
    <MemoryRouter>
      <RoutingConfigContext.Provider value={{ configs }}>
        <RoutingConfigurationsView noTitle={noTitle} />
      </RoutingConfigContext.Provider>
    </MemoryRouter>,
  );

describe('RoutingConfigurationsView', () => {
  it('should render the table when configurations exist', () => {
    renderView([mockLLMInferenceServiceConfigK8sResource({ name: 'prefill-decode' })]);

    expect(screen.getByTestId('routing-configurations-table')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-routing-configurations')).not.toBeInTheDocument();
  });

  it('should render the empty state instead of the table when there are no configurations', () => {
    renderView([]);

    expect(screen.getByTestId('empty-routing-configurations')).toBeInTheDocument();
    expect(screen.queryByTestId('routing-configurations-table')).not.toBeInTheDocument();
  });

  it('should render the page title by default', () => {
    renderView([]);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('llm-d routing configurations');
  });

  it('should hide the page title when rendered as tab content', () => {
    renderView([], true);

    expect(screen.queryByTestId('app-page-title')).not.toBeInTheDocument();
    // The description is still shown so the tab explains itself.
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage routing configurations for LLM inference service deployments.',
    );
  });
});
