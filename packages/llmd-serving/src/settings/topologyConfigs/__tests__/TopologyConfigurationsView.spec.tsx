import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import TopologyConfigurationsView from '../TopologyConfigurationsView';
import { TopologyConfigContext } from '../TopologyConfigContext';
import type { LLMInferenceServiceConfigKind } from '../../../types';

jest.mock('../TopologyConfigurationsTable', () => ({
  __esModule: true,
  default: () => <div data-testid="table" />,
}));
jest.mock('../EmptyTopologyConfigurations', () => ({
  __esModule: true,
  default: () => <div data-testid="empty-state" />,
}));

const renderView = (configs: LLMInferenceServiceConfigKind[], noTitle?: boolean) =>
  render(
    <MemoryRouter>
      <TopologyConfigContext.Provider value={{ configs }}>
        <TopologyConfigurationsView noTitle={noTitle} />
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

describe('TopologyConfigurationsView', () => {
  it('should render the table when configs exist', () => {
    renderView([mockLLMInferenceServiceConfigK8sResource({ name: 'tc-1' })]);
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('should render the empty state when there are no configs', () => {
    renderView([]);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render the page title by default', () => {
    renderView([]);
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('llm-d topology configurations');
  });

  it('should hide the page title when rendered as tab content', () => {
    renderView([], true);
    expect(screen.queryByTestId('app-page-title')).not.toBeInTheDocument();
  });
});
