/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { AIModel } from '~/app/types';
import AIModelsTableRowInfo from '~/app/AIAssets/components/AIModelsTableRowInfo';

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  DashboardPopupIconButton: ({
    icon,
    onClick,
    children,
    ...props
  }: {
    icon: React.ReactNode;
    onClick?: () => void;
    children?: React.ReactNode;
  }) => (
    <button onClick={onClick} {...props}>
      {icon}
      {children}
    </button>
  ),
}));

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id-123',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model Display Name',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

describe('AIModelsTableRowInfo', () => {
  it('should render model display name', () => {
    const model = createMockAIModel({ display_name: 'My Custom Model' });
    render(<AIModelsTableRowInfo model={model} />);

    expect(screen.getByText('My Custom Model')).toBeInTheDocument();
  });

  it('should render info icon button', () => {
    const model = createMockAIModel();
    render(<AIModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('model-id-icon-button');
    expect(infoButton).toBeInTheDocument();
  });

  it('should show popover with model ID when info button is clicked', async () => {
    const user = userEvent.setup();
    const model = createMockAIModel({ model_id: 'unique-model-id' });
    render(<AIModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('model-id-icon-button');
    await user.click(infoButton);

    expect(screen.getByText(/The model ID is a unique identifier required/i)).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('unique-model-id')).toBeInTheDocument();
  });

  it('should render ClipboardCopy component with model ID', async () => {
    const user = userEvent.setup();
    const model = createMockAIModel({ model_id: 'test-model-id-456' });
    render(<AIModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('model-id-icon-button');
    await user.click(infoButton);

    const clipboardInput = screen.getByDisplayValue('test-model-id-456');
    expect(clipboardInput).toBeInTheDocument();
  });

  it('should render model info with correct structure', () => {
    const model = createMockAIModel({
      display_name: 'Test Display',
      model_id: 'test-id',
    });
    render(<AIModelsTableRowInfo model={model} />);

    // Check that display name and button are in the same container
    expect(screen.getByText('Test Display')).toBeInTheDocument();
    expect(screen.getByTestId('model-id-icon-button')).toBeInTheDocument();
  });

  it('should show explanation text in popover', async () => {
    const user = userEvent.setup();
    const model = createMockAIModel();
    render(<AIModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('model-id-icon-button');
    await user.click(infoButton);

    expect(
      screen.getByText(/unique identifier required to locate and access this model/i),
    ).toBeInTheDocument();
  });
});
