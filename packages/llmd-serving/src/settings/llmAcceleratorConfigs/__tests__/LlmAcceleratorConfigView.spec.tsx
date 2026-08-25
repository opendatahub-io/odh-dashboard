import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigView from '../LlmAcceleratorConfigView';
import { LlmAcceleratorConfigContext } from '../LlmAcceleratorConfigContext';
import type { LLMInferenceServiceConfigKind } from '../../../types';

jest.mock('../LlmAcceleratorConfigListView', () => ({
  __esModule: true,
  default: () => <div data-testid="list-view">List View</div>,
}));

const renderView = (configs: LLMInferenceServiceConfigKind[]) =>
  render(
    <MemoryRouter>
      <LlmAcceleratorConfigContext.Provider value={{ configs }}>
        <LlmAcceleratorConfigView />
      </LlmAcceleratorConfigContext.Provider>
    </MemoryRouter>,
  );

describe('LlmAcceleratorConfigView', () => {
  it('should render the list view when configurations exist', () => {
    renderView([mockLLMInferenceServiceConfigK8sResource({ name: 'vllm-cuda' })]);

    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('llm-accelerator-configs-empty-state')).not.toBeInTheDocument();
  });

  it('should render the empty state instead of the list when there are no configurations', () => {
    renderView([]);

    expect(screen.getByTestId('llm-accelerator-configs-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
  });

  // Regression: the list toolbar that normally hosts the add button is not rendered
  // while the list is empty, so the empty state must carry the action itself.
  // Without it an administrator with no configurations cannot create the first one.
  it('should offer an add action from the empty state', () => {
    renderView([]);

    const addButton = screen.getByTestId('add-accelerator-config-button');

    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveAttribute('href', '/add');
  });

  it('should suppress the page title (rendered as a tab, title is not needed)', () => {
    renderView([]);

    expect(screen.queryByTestId('app-page-title')).not.toBeInTheDocument();
    // The description is still shown so the tab explains itself.
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage accelerator configurations for LLM inference service deployments.',
    );
  });
});
