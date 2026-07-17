import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table as PfTable, Tbody } from '@patternfly/react-table';
import { MemoryRouter } from 'react-router-dom';
import { mockAgentCardDetail, mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import { useAgentLifecycleActions } from '~/app/hooks/useAgentLifecycleActions';
import AgentRuntimesTableRow from '~/app/pages/agentRuntimes/AgentRuntimesTableRow';
import {
  createFailedRuntime,
  createMockAgentRuntime,
  createPendingRuntime,
  createReadyRuntime,
  createStoppedRuntime,
  createUnknownRuntime,
} from './agentRuntimeTestUtils';

jest.mock('~/app/hooks/useAgentRuntimeDetail', () => ({
  useAgentRuntimeDetail: jest.fn(),
}));

jest.mock('~/app/hooks/useAgentLifecycleActions', () => ({
  useAgentLifecycleActions: jest.fn(),
}));

const mockUseAgentRuntimeDetail = jest.mocked(useAgentRuntimeDetail);
const mockUseAgentLifecycleActions = jest.mocked(useAgentLifecycleActions);

const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

const findDeleteModalConfirmButton = () =>
  within(screen.getByTestId('agent-delete-modal')).getByRole('button', { name: 'Delete' });

const findDeleteModalCancelButton = () =>
  within(screen.getByTestId('agent-delete-modal')).getByRole('button', { name: 'Cancel' });

const defaultLifecycleActions = {
  visibility: { showRestart: true, showStop: true, showDelete: true },
  isPending: false,
  isDeleting: false,
  handleRestart: jest.fn().mockResolvedValue(undefined),
  handleStop: jest.fn().mockResolvedValue(undefined),
  handleDelete: jest.fn().mockResolvedValue(undefined),
};

const renderRow = (runtime: AgentRuntime) =>
  render(
    <MemoryRouter>
      <PfTable>
        <Tbody>
          <AgentRuntimesTableRow runtime={runtime} onRefresh={mockOnRefresh} />
        </Tbody>
      </PfTable>
    </MemoryRouter>,
  );

const getActionsToggleLabel = (runtime: AgentRuntime) =>
  `Actions for ${runtime.name} in ${runtime.namespace}`;

const openKebab = async (user: ReturnType<typeof userEvent.setup>, runtime: AgentRuntime) => {
  await user.click(screen.getByRole('button', { name: getActionsToggleLabel(runtime) }));
};

describe('AgentRuntimesTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({ agentCard: mockAgentCardDetail() }),
      true,
      undefined,
      jest.fn(),
    ]);
    mockUseAgentLifecycleActions.mockReturnValue(defaultLifecycleActions);
  });

  it('should render name and namespace columns', () => {
    renderRow(createMockAgentRuntime());
    expect(screen.getByTestId('agent-runtime-name')).toHaveTextContent('sample-support-agent');
    expect(screen.getByTestId('agent-runtime-namespace')).toHaveTextContent('agent-ops-demo');
  });

  it('should wire status label from runtime status', () => {
    renderRow(createReadyRuntime());
    expect(screen.getByTestId('agent-runtime-status-label')).toBeInTheDocument();
  });

  it('should keep View enabled when runtime has no list endpoints', () => {
    renderRow(createFailedRuntime());
    expect(screen.getByTestId('agent-runtime-endpoint-view')).toBeEnabled();
  });

  it('should open endpoints modal when View is clicked', async () => {
    const user = userEvent.setup();
    renderRow(createReadyRuntime());

    await user.click(screen.getByTestId('agent-runtime-endpoint-view'));
    expect(screen.getByTestId('agent-runtime-endpoints-modal')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
      ),
    ).toBeInTheDocument();
  });

  it('should use a unique actions toggle label per runtime row', () => {
    render(
      <MemoryRouter>
        <PfTable>
          <Tbody>
            <AgentRuntimesTableRow runtime={createReadyRuntime()} onRefresh={mockOnRefresh} />
            <AgentRuntimesTableRow runtime={createStoppedRuntime()} onRefresh={mockOnRefresh} />
          </Tbody>
        </PfTable>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: getActionsToggleLabel(createReadyRuntime()) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: getActionsToggleLabel(createStoppedRuntime()) }),
    ).toBeInTheDocument();
  });

  it('should show lifecycle actions for ready runtimes', async () => {
    const user = userEvent.setup();
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      visibility: { showRestart: true, showStop: true, showDelete: true },
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    expect(screen.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Restart' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should show restart and delete without stop for stopped runtimes', async () => {
    const user = userEvent.setup();
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      visibility: { showRestart: true, showStop: false, showDelete: true },
    });
    renderRow(createStoppedRuntime());

    await openKebab(user, createStoppedRuntime());
    expect(screen.getByRole('menuitem', { name: 'Restart' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should call restart handler without opening a modal', async () => {
    const user = userEvent.setup();
    const handleRestart = jest.fn().mockResolvedValue(undefined);
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      handleRestart,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Restart' }));
    expect(handleRestart).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('agent-delete-modal')).not.toBeInTheDocument();
  });

  it('should call stop handler without opening a modal', async () => {
    const user = userEvent.setup();
    const handleStop = jest.fn().mockResolvedValue(undefined);
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      handleStop,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Stop' }));
    expect(handleStop).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('agent-delete-modal')).not.toBeInTheDocument();
  });

  it('should open delete modal when Delete is clicked', async () => {
    const user = userEvent.setup();
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByTestId('agent-delete-modal')).toHaveTextContent('sample-support-agent');
  });

  it('should call delete handler when delete modal is confirmed', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn().mockResolvedValue(undefined);
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      handleDelete,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(findDeleteModalConfirmButton());
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('agent-delete-modal')).not.toBeInTheDocument();
  });

  it('should keep delete modal open when delete fails', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      handleDelete,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(findDeleteModalConfirmButton());
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('agent-delete-modal')).toBeInTheDocument();
  });

  it('should not submit duplicate delete requests while confirmation is in flight', async () => {
    const user = userEvent.setup();
    let resolveDelete: (value?: void) => void = () => undefined;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const handleDelete = jest.fn().mockReturnValue(deletePromise);
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      isDeleting: false,
      handleDelete,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    const confirmButton = findDeleteModalConfirmButton();
    await user.click(confirmButton);
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(confirmButton).toBeDisabled();

    await user.click(confirmButton);
    expect(handleDelete).toHaveBeenCalledTimes(1);

    resolveDelete();
    await deletePromise;
  });

  it('should close delete modal without deleting when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn().mockResolvedValue(undefined);
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      handleDelete,
    });
    renderRow(createReadyRuntime());

    await openKebab(user, createReadyRuntime());
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByTestId('agent-delete-modal')).toBeInTheDocument();
    await user.click(findDeleteModalCancelButton());
    expect(screen.queryByTestId('agent-delete-modal')).not.toBeInTheDocument();
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('should pass runtime and refresh callback to lifecycle hook', () => {
    const runtime = createPendingRuntime();
    renderRow(runtime);

    expect(mockUseAgentLifecycleActions).toHaveBeenCalledWith({
      runtime,
      onRefresh: mockOnRefresh,
    });
  });

  it('should hide stop and restart for pending runtimes', async () => {
    const user = userEvent.setup();
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      visibility: { showRestart: false, showStop: false, showDelete: true },
    });

    renderRow(createPendingRuntime());
    await openKebab(user, createPendingRuntime());
    expect(screen.queryByRole('menuitem', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Restart' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should hide stop and restart for failed runtimes', async () => {
    const user = userEvent.setup();
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      visibility: { showRestart: false, showStop: false, showDelete: true },
    });

    renderRow(createFailedRuntime());
    await openKebab(user, createFailedRuntime());
    expect(screen.queryByRole('menuitem', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Restart' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should hide stop and restart for unknown runtimes', async () => {
    const user = userEvent.setup();
    mockUseAgentLifecycleActions.mockReturnValue({
      ...defaultLifecycleActions,
      visibility: { showRestart: false, showStop: false, showDelete: true },
    });
    renderRow(createUnknownRuntime());

    await openKebab(user, createUnknownRuntime());
    expect(screen.queryByRole('menuitem', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Restart' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should hide detail navigation when discovery mode is on', () => {
    render(
      <MemoryRouter>
        <PfTable>
          <Tbody>
            <AgentRuntimesTableRow
              runtime={createReadyRuntime()}
              onRefresh={mockOnRefresh}
              discoveryMode
            />
          </Tbody>
        </PfTable>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agent-runtime-name')).toHaveTextContent('sample-support-agent');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: getActionsToggleLabel(createReadyRuntime()) }),
    ).not.toBeInTheDocument();
  });
});
