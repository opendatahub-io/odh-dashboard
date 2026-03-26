import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table as PfTable, Tbody } from '@patternfly/react-table';
import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
import McpDeploymentsTableRow from '../McpDeploymentsTableRow';
import { createMockDeployment } from './mcpDeploymentTestUtils';

const renderRow = (deployment: McpDeployment, onDeleteClick = jest.fn()) =>
  render(
    <PfTable>
      <Tbody>
        <McpDeploymentsTableRow deployment={deployment} onDeleteClick={onDeleteClick} />
      </Tbody>
    </PfTable>,
  );

describe('McpDeploymentsTableRow', () => {
  it('should render server name derived from image', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-server')).toHaveTextContent('Kubernetes-1.0.0');
  });

  it('should render deployment name', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-name')).toHaveTextContent('kubernetes-mcp');
  });

  it('should render a non-empty formatted creation date', () => {
    renderRow(createMockDeployment());
    const dateCell = screen.getByTestId('mcp-deployment-created');
    expect(dateCell.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/);
  });

  it('should render status label that maps phase to display label', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.RUNNING }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Available');
  });

  it('should render View link for Running deployment and show connection URL in popover', async () => {
    const user = userEvent.setup();
    renderRow(
      createMockDeployment({
        phase: McpDeploymentPhase.RUNNING,
        address: { url: 'kubernetes-test:8080' },
      }),
    );
    const viewLink = screen.getByTestId('mcp-deployment-service-view');
    expect(viewLink).toBeInTheDocument();

    await user.click(viewLink);
    const popover = await screen.findByTestId('mcp-deployment-connection-url');
    expect(popover).toBeInTheDocument();
    expect(popover.querySelector('input')).toHaveValue('kubernetes-test:8080');
  });

  it.each([McpDeploymentPhase.FAILED, McpDeploymentPhase.PENDING])(
    'should render dash for %s deployment without address',
    (phase) => {
      renderRow(createMockDeployment({ phase }));
      expect(screen.getByTestId('mcp-deployment-service-unavailable')).toBeInTheDocument();
    },
  );
});
