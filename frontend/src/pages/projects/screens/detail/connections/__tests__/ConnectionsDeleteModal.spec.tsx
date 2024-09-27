import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionsDeleteModal } from '~/pages/projects/screens/detail/connections/ConnectionsDeleteModal';
import { mockConnection } from '~/__mocks__/mockConnection';
import { useRelatedNotebooks } from '~/pages/projects/notebook/useRelatedNotebooks';
import { mockNotebookK8sResource, mockNotebookState } from '~/__mocks__';
import { useNotebooksStates } from '~/pages/projects/notebook/useNotebooksStates';

jest.mock('~/pages/projects/notebook/useRelatedNotebooks', () => ({
  ...jest.requireActual('~/pages/projects/notebook/useRelatedNotebooks'),
  useRelatedNotebooks: jest.fn(),
}));

jest.mock('~/pages/projects/notebook/useNotebooksStates', () => ({
  useNotebooksStates: jest.fn(),
}));

const useRelatedNotebooksMock = useRelatedNotebooks as jest.Mock;
const useNotebooksStatesMock = useNotebooksStates as jest.Mock;

const mockNotebooks = [
  mockNotebookK8sResource({ name: 'connected-notebook', displayName: 'Connected notebook' }),
  mockNotebookK8sResource({ name: 'another-notebook', displayName: 'Another notebook' }),
];
describe('Delete connection modal', () => {
  const onDelete = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    useRelatedNotebooksMock.mockReturnValue({
      notebooks: mockNotebooks,
      loaded: true,
    });
    useNotebooksStatesMock.mockReturnValue([
      [
        mockNotebookState(mockNotebooks[0], { isRunning: true }),
        mockNotebookState(mockNotebooks[1], { isStopped: true }),
      ],
    ]);
  });

  it('should show related resources', async () => {
    const deleteConnection = mockConnection({ displayName: 'connection1', description: 'desc1' });

    render(
      <ConnectionsDeleteModal
        namespace={deleteConnection.metadata.namespace}
        deleteConnection={deleteConnection}
        onClose={onClose}
        onDelete={onDelete}
      />,
    );

    const notebooksCountBadge = screen.getByTestId('connections-delete-notebooks-count');
    expect(notebooksCountBadge).toHaveTextContent('2');
    await act(() => fireEvent.click(notebooksCountBadge));

    const notebookItems = screen.getAllByTestId('connections-delete-notebooks-item');
    expect(notebookItems).toHaveLength(2);
    expect(notebookItems[0]).toHaveTextContent('Connected notebook (Running)');
    expect(notebookItems[1]).toHaveTextContent('Another notebook');
  });
});
