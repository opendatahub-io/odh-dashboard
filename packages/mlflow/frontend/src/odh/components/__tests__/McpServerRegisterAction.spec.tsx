import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMLflowStatus } from '@odh-dashboard/internal/concepts/mlflow/hooks/useMLflowStatus';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockMcpServer } from '~/__mocks__/mockMcpCatalog';
import type { McpServer } from '~/app/types/mcpCatalogTypes';
import { useMcpServerConverter } from '~/app/hooks/useMcpServerCatalog';
import { REGISTER_BUTTON_TOOLTIP } from '~/odh/const';
import McpServerRegisterAction from '~/odh/components/McpServerRegisterAction';

jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useMLflowStatus', () => ({
  useMLflowStatus: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/areas/useFetchDscStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('~/app/hooks/useMcpServerCatalog', () => ({
  useMcpServerConverter: jest.fn(),
}));
jest.mock(
  '~/odh/components/McpRegisterModal',
  () =>
    function StubMcpRegisterModal({ onClose }: { onClose: () => void }) {
      return (
        <div data-testid="mcp-register-modal">
          <button type="button" data-testid="stub-close-modal" onClick={() => onClose()}>
            Close
          </button>
        </div>
      );
    },
);

const mockUseMLflowStatus = jest.mocked(useMLflowStatus);
const mockUseFetchDscStatus = jest.mocked(useFetchDscStatus);
const mockUseMcpServerConverter = jest.mocked(useMcpServerConverter);

const renderAction = (
  server: { data: McpServer | null; loaded: boolean; error?: Error } = {
    data: mockMcpServer({ id: 'server-1', toolCount: 1 }),
    loaded: true,
  },
) => render(<McpServerRegisterAction server={server} />);

describe('McpServerRegisterAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMLflowStatus.mockReturnValue({ configured: true, loaded: true, error: false });
    mockUseFetchDscStatus.mockReturnValue([mockDscStatus({}), true, undefined, jest.fn()]);
    mockUseMcpServerConverter.mockReturnValue([null, true, undefined, jest.fn()]);
  });

  it('should enable the register button when catalog, MLflow, and converter prerequisites are met', () => {
    renderAction();

    const button = screen.getByTestId('mcp-register-button');
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('mcp-register-modal')).not.toBeInTheDocument();
  });

  it('should disable the button while server details are still loading', () => {
    renderAction({ data: null, loaded: false });

    expect(screen.getByTestId('mcp-register-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable the button when MLflow is unreachable', async () => {
    const user = userEvent.setup();
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: true });

    renderAction();

    const button = screen.getByTestId('mcp-register-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.hover(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      REGISTER_BUTTON_TOOLTIP.MLFLOW_UNREACHABLE,
    );
  });

  it('should disable the button when MLflow is not configured', async () => {
    const user = userEvent.setup();
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: false });

    renderAction();

    const button = screen.getByTestId('mcp-register-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.hover(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      REGISTER_BUTTON_TOOLTIP.MLFLOW_UNAVAILABLE,
    );
  });

  it('should keep the button loading until the converter request settles', () => {
    mockUseMcpServerConverter.mockReturnValue([null, false, undefined, jest.fn()]);

    renderAction();

    expect(screen.getByTestId('mcp-register-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should treat a converter error as settled so register is not blocked forever', () => {
    mockUseMcpServerConverter.mockReturnValue([
      null,
      false,
      new Error('no container image'),
      jest.fn(),
    ]);

    renderAction();

    expect(screen.getByTestId('mcp-register-button')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should open the register modal when the enabled button is clicked, and close it from the modal', async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(screen.getByTestId('mcp-register-button'));
    expect(screen.getByTestId('mcp-register-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('stub-close-modal'));
    expect(screen.queryByTestId('mcp-register-modal')).not.toBeInTheDocument();
  });

  it('should not render the modal when there is no server data even if the button is clicked', async () => {
    const user = userEvent.setup();
    renderAction({ data: null, loaded: true, error: new Error('not found') });

    await user.click(screen.getByTestId('mcp-register-button'));
    expect(screen.queryByTestId('mcp-register-modal')).not.toBeInTheDocument();
  });

  it('should not open the modal when the button is aria-disabled', async () => {
    const user = userEvent.setup();
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: true });

    renderAction();

    await user.click(screen.getByTestId('mcp-register-button'));
    expect(screen.queryByTestId('mcp-register-modal')).not.toBeInTheDocument();
  });

  it('should keep the modal open if catalog data or MLflow status changes after it opened', async () => {
    const user = userEvent.setup();
    const catalogServer = mockMcpServer({ id: 'server-1', toolCount: 1 });
    const { rerender } = render(
      <McpServerRegisterAction server={{ data: catalogServer, loaded: true }} />,
    );

    await user.click(screen.getByTestId('mcp-register-button'));
    expect(screen.getByTestId('mcp-register-modal')).toBeInTheDocument();

    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: true });
    rerender(<McpServerRegisterAction server={{ data: null, loaded: true }} />);

    expect(screen.getByTestId('mcp-register-modal')).toBeInTheDocument();
  });
});
