import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentRuntimeEndpointsModal from '~/app/components/AgentRuntimeEndpointsModal';
import { createReadyRuntime } from '~/app/pages/agentRuntimes/__tests__/agentRuntimeTestUtils';

describe('AgentRuntimeEndpointsModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the port forward command', () => {
    const runtime = createReadyRuntime();
    render(<AgentRuntimeEndpointsModal runtime={runtime} onClose={onClose} />);

    expect(
      screen.getByDisplayValue(`openshell forward start <port> ${runtime.name}`),
    ).toBeInTheDocument();
  });

  it('should render the expose service command', () => {
    const runtime = createReadyRuntime();
    render(<AgentRuntimeEndpointsModal runtime={runtime} onClose={onClose} />);

    expect(
      screen.getByDisplayValue(
        `openshell service expose ${runtime.name} <port> <service-name>`,
      ),
    ).toBeInTheDocument();
  });

  it('should render the connect to shell command', () => {
    const runtime = createReadyRuntime();
    render(<AgentRuntimeEndpointsModal runtime={runtime} onClose={onClose} />);

    expect(
      screen.getByDisplayValue(`openshell sandbox connect -n ${runtime.name}`),
    ).toBeInTheDocument();
  });

  it('should call onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    render(<AgentRuntimeEndpointsModal runtime={createReadyRuntime()} onClose={onClose} />);

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
