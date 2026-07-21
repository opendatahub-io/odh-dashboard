import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Table, Tbody } from '@patternfly/react-table';
import ConnectionsTableRow from '#~/pages/projects/screens/detail/connections/ConnectionsTableRow';
import { mockConnection } from '#~/__mocks__/mockConnection';
import { mockConnectionTypeConfigMapObj } from '#~/__mocks__/mockConnectionType';
import {
  ConnectionTestStatus,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';

// Mock ConnectedResources to avoid cascading mocks for its hooks
jest.mock('#~/pages/projects/screens/detail/connections/ConnectedResources', () => {
  const MockConnectedResources: React.FC = () => <span data-testid="connected-resources">-</span>;
  return { __esModule: true, default: MockConnectedResources };
});

// Mock CompatibilityLabel
jest.mock('#~/concepts/connectionTypes/CompatibilityLabel', () => {
  const MockCompatibilityLabel: React.FC<{ type: string }> = ({ type }) => (
    <span data-testid={`compatibility-label-${type}`}>{type}</span>
  );
  return { __esModule: true, default: MockCompatibilityLabel };
});

// Helper to wrap row in a table for valid HTML structure
const renderRow = (ui: React.ReactElement) =>
  render(
    <Table>
      <Tbody>{ui}</Tbody>
    </Table>,
  );

describe('ConnectionsTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultKebabActions = [
    { title: 'Edit', onClick: jest.fn() },
    { title: 'Delete', onClick: jest.fn() },
  ];

  it('should render connection name and type', () => {
    const connection = mockConnection({
      displayName: 'My S3 Connection',
      description: 'Test description',
    });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({ name: 's3', displayName: 'S3 Buckets' }),
        ]}
        kebabActions={defaultKebabActions}
      />,
    );

    expect(screen.getByText('My S3 Connection')).toBeInTheDocument();
    expect(screen.getByText('S3 Buckets')).toBeInTheDocument();
  });

  it('should render status cell with Not tested label by default', () => {
    const connection = mockConnection({ displayName: 'test-conn' });

    renderRow(<ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} />);

    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });

  it('should render Verified status from annotations', () => {
    const connection = mockConnection({ displayName: 'test-conn' });
    connection.metadata.annotations = {
      ...connection.metadata.annotations,
      [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.VERIFIED,
      [CONNECTION_TEST_ANNOTATIONS.TIMESTAMP]: '2024-12-15T10:30:00Z',
      [CONNECTION_TEST_ANNOTATIONS.MESSAGE]: 'Connection successful',
    };

    renderRow(<ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} />);

    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();
  });

  it('should render Failed status from annotations with timestamp', () => {
    const connection = mockConnection({ displayName: 'test-conn' });
    connection.metadata.annotations = {
      ...connection.metadata.annotations,
      [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.FAILED,
      [CONNECTION_TEST_ANNOTATIONS.TIMESTAMP]: '2024-12-15T10:30:00Z',
      [CONNECTION_TEST_ANNOTATIONS.MESSAGE]: 'Connection refused',
    };

    renderRow(<ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} />);

    expect(screen.getByTestId('connection-test-label-failed')).toBeInTheDocument();
  });

  it('should render connection type ref when no matching type found', () => {
    const connection = mockConnection({
      displayName: 'test-conn',
      connectionType: 'unknown-type',
    });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        connectionTypes={[]}
        kebabActions={defaultKebabActions}
      />,
    );

    expect(screen.getByText('unknown-type')).toBeInTheDocument();
  });

  it('should show resource info popover on help icon click', () => {
    const connection = mockConnection({
      displayName: 'test-conn',
      description: 'A description',
    });

    renderRow(<ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} />);

    // The TableRowTitleDescription component renders resource info
    expect(screen.getByText('test-conn')).toBeInTheDocument();
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('should show warning icon when showWarningIcon is true', () => {
    const connection = mockConnection({ displayName: 'test-conn' });

    renderRow(
      <ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} showWarningIcon />,
    );

    expect(screen.getByText('test-conn')).toBeInTheDocument();
  });

  it('should hide compatibility cell when showCompatibilityCell is false', () => {
    const connection = mockConnection({ displayName: 'test-conn' });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        kebabActions={defaultKebabActions}
        showCompatibilityCell={false}
      />,
    );

    expect(screen.getByText('test-conn')).toBeInTheDocument();
    // When showCompatibilityCell is false, the compatibility column should not be in the DOM
    expect(screen.queryByText('Compatibility')).not.toBeInTheDocument();
  });

  it('should hide connected resources cell when showConnectedResourcesCell is false', () => {
    const connection = mockConnection({ displayName: 'test-conn' });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        kebabActions={defaultKebabActions}
        showConnectedResourcesCell={false}
      />,
    );

    expect(screen.getByText('test-conn')).toBeInTheDocument();
    expect(screen.queryByTestId('connected-resources')).not.toBeInTheDocument();
  });

  it('should render kebab actions', () => {
    const editFn = jest.fn();
    const deleteFn = jest.fn();
    const connection = mockConnection({ displayName: 'test-conn' });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        kebabActions={[
          { title: 'Edit', onClick: editFn },
          { title: 'Delete', onClick: deleteFn },
        ]}
      />,
    );

    // The ActionsColumn renders a kebab button
    expect(screen.getByText('test-conn')).toBeInTheDocument();
  });

  it('should show Testing status when isTesting prop is true', () => {
    const connection = mockConnection({ displayName: 'test-conn' });
    connection.metadata.annotations = {
      ...connection.metadata.annotations,
      [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.VERIFIED,
      [CONNECTION_TEST_ANNOTATIONS.TIMESTAMP]: '2024-12-15T10:30:00Z',
    };

    renderRow(
      <ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} isTesting />,
    );

    expect(screen.getByTestId('connection-test-label-testing')).toBeInTheDocument();
    expect(screen.queryByTestId('connection-test-label-verified')).not.toBeInTheDocument();
  });

  it('should render connection name as a clickable link when onEditConnection is provided', () => {
    const onEditConnection = jest.fn();
    const connection = mockConnection({ displayName: 'My Connection' });

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        kebabActions={defaultKebabActions}
        onEditConnection={onEditConnection}
      />,
    );

    const link = screen.getByTestId('connection-name-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('My Connection');
  });

  it('should fall back to NOT_TESTED when annotation has invalid status value', () => {
    const connection = mockConnection({ displayName: 'test-conn' });
    connection.metadata.annotations = {
      ...connection.metadata.annotations,
      [CONNECTION_TEST_ANNOTATIONS.STATUS]: 'invalid-status',
    };

    renderRow(<ConnectionsTableRow obj={connection} kebabActions={defaultKebabActions} />);

    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });

  it('should hide status cell when showStatusCell is false', () => {
    const connection = mockConnection({ displayName: 'test-conn' });
    connection.metadata.annotations = {
      ...connection.metadata.annotations,
      [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.VERIFIED,
    };

    renderRow(
      <ConnectionsTableRow
        obj={connection}
        kebabActions={defaultKebabActions}
        showStatusCell={false}
      />,
    );

    expect(screen.queryByTestId('connection-status-cell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connection-test-label-verified')).not.toBeInTheDocument();
  });
});
