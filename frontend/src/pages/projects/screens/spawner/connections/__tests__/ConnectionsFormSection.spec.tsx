import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import { mockProjectK8sResource } from '~/__mocks__';
import { ConnectionsFormSection } from '~/pages/projects/screens/spawner/connections/ConnectionsFormSection';
import { mockConnection } from '~/__mocks__/mockConnection';

jest.mock('~/pages/projects/notebook/useNotebooksStates', () => ({
  useNotebooksStates: jest.fn().mockReturnValue([[]]),
}));
jest.mock('~/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: jest.fn().mockReturnValue([[], true, undefined, jest.fn()]),
}));

describe('ConnectionsFormSection', () => {
  it('should render empty section', () => {
    const result = render(
      <ConnectionsFormSection
        project={mockProjectK8sResource({})}
        projectConnections={[]}
        refreshProjectConnections={() => undefined}
        projectConnectionsLoaded
        projectConnectionsLoadError={undefined}
        notebookDisplayName=""
        selectedConnections={[]}
        setSelectedConnections={() => undefined}
      />,
    );

    expect(result.getByRole('button', { name: 'Attach existing connections' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Create connection' })).toBeTruthy();
    expect(result.getByRole('heading', { name: 'No connections' })).toBeTruthy();
  });

  it('should list existing connections', () => {
    const result = render(
      <ConnectionsFormSection
        project={mockProjectK8sResource({})}
        projectConnections={[
          mockConnection({ name: 's3-connection-1', displayName: 's3 connection 1' }),
          mockConnection({ name: 's3-connection-2', displayName: 's3 connection 2' }),
          mockConnection({ name: 's3-connection-3', displayName: 's3 connection 3' }),
        ]}
        refreshProjectConnections={() => undefined}
        projectConnectionsLoaded
        projectConnectionsLoadError={undefined}
        notebookDisplayName=""
        selectedConnections={[
          mockConnection({ name: 's3-connection-1', displayName: 's3 connection 1' }),
          mockConnection({ name: 's3-connection-2', displayName: 's3 connection 2' }),
        ]}
        setSelectedConnections={() => undefined}
      />,
    );

    expect(result.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(result.getByRole('columnheader', { name: 'Type' })).toBeTruthy();
    expect(result.getByRole('cell', { name: 's3 connection 1' })).toBeTruthy();
    expect(result.getByRole('cell', { name: 's3 connection 2' })).toBeTruthy();
    expect(result.getAllByRole('cell', { name: 's3' }).length).toEqual(2);
  });

  it('should show env conflicts', async () => {
    const result = render(
      <ConnectionsFormSection
        project={mockProjectK8sResource({})}
        projectConnections={[]}
        refreshProjectConnections={() => undefined}
        projectConnectionsLoaded
        projectConnectionsLoadError={undefined}
        notebookDisplayName=""
        selectedConnections={[
          mockConnection({
            name: 's3-connection-1',
            displayName: 's3 connection 1',
            data: { ENV1: '' },
          }),
          mockConnection({
            name: 's3-connection-2',
            displayName: 's3 connection 2',
            data: { ENV1: '' },
          }),
        ]}
        setSelectedConnections={() => undefined}
      />,
    );

    expect(
      result.getByRole('heading', { name: 'Warning alert: Connections conflict' }),
    ).toBeTruthy();

    await act(async () => result.getByRole('button', { name: 'Show conflicts' }).click());
    expect(result.getByTestId('envvar-conflict-0')).toHaveTextContent(
      's3 connection 2 and s3 connection 1 contain the following conflicting variables:ENV1',
    );
  });

  it('should attach existing connection', async () => {
    const setSelectedConnectionsMock = jest.fn();
    const result = render(
      <ConnectionsFormSection
        project={mockProjectK8sResource({})}
        projectConnections={[
          mockConnection({ name: 's3-connection-1', displayName: 's3 connection 1' }),
          mockConnection({ name: 's3-connection-2', displayName: 's3 connection 2' }),
          mockConnection({ name: 's3-connection-3', displayName: 's3 connection 3' }),
        ]}
        refreshProjectConnections={() => undefined}
        projectConnectionsLoaded
        projectConnectionsLoadError={undefined}
        notebookDisplayName=""
        selectedConnections={[
          mockConnection({ name: 's3-connection-1', displayName: 's3 connection 1' }),
        ]}
        setSelectedConnections={setSelectedConnectionsMock}
      />,
    );

    act(() => result.getByRole('button', { name: 'Attach existing connections' }).click());
    const attachModal = result.getByRole('dialog');
    expect(attachModal).toBeTruthy();
    expect(within(attachModal).getByRole('button', { name: 'Attach' })).toBeDisabled();
    expect(within(attachModal).getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(within(attachModal).getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Connections' }).click());
    expect(result.queryByRole('option', { name: 's3 connection 1' })).toBeFalsy(); // don't show attached connections
    expect(result.getByRole('option', { name: 's3 connection 2' })).toBeTruthy();
    expect(result.getByRole('option', { name: 's3 connection 3' })).toBeTruthy();

    await act(async () => result.getByRole('option', { name: 's3 connection 3' }).click());
    expect(result.getByRole('list', { name: 'Current selections' })).toHaveTextContent(
      's3 connection 3',
    );

    await act(async () => result.getByRole('button', { name: 'Attach' }).click());
    expect(result.queryByRole('dialog', { name: 'Attach existing connections' })).toBeFalsy();
    expect(setSelectedConnectionsMock).toBeCalledWith([
      mockConnection({ name: 's3-connection-1', displayName: 's3 connection 1' }),
      mockConnection({ name: 's3-connection-3', displayName: 's3 connection 3' }),
    ]);
  });
});
