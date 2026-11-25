import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionsDeleteModal } from '#~/pages/projects/screens/detail/connections/ConnectionsDeleteModal';
import { mockConnection } from '#~/__mocks__/mockConnection';
import { useRelatedNotebooks } from '#~/pages/projects/notebook/useRelatedNotebooks';
import { mockNotebookK8sResource, mockNotebookState } from '#~/__mocks__';
import { useNotebooksStates } from '#~/pages/projects/notebook/useNotebooksStates';

jest.mock('#~/pages/projects/notebook/useRelatedNotebooks', () => ({
  ...jest.requireActual('#~/pages/projects/notebook/useRelatedNotebooks'),
  useRelatedNotebooks: jest.fn(),
}));

jest.mock('#~/pages/projects/notebook/useNotebooksStates', () => ({
  useNotebooksStates: jest.fn(),
}));

const useRelatedNotebooksMock = useRelatedNotebooks as jest.Mock;
const useNotebooksStatesMock = useNotebooksStates as jest.Mock;
const mockNotebooks = [
  mockNotebookK8sResource({ name: 'connected-notebook', displayName: 'Connected notebook' }),
  mockNotebookK8sResource({ name: 'another-notebook', displayName: 'Another notebook' }),
];

const connectedResourceLabels = [
  { key: 'kserve:inference-service', title: 'KServe model', kind: 'connected-models' },
  { key: 'llmd:llm-inference-service', title: 'LLM-D model', kind: 'connected-models' },
] as const;
describe('Delete connection modal', () => {
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
        connectedResources={[...connectedResourceLabels]}
        connectedResourcesLoaded
        onClose={onClose}
      />,
    );

    const notebooksCountBadge = screen.getByTestId('connections-delete-notebooks-count');
    expect(notebooksCountBadge).toHaveTextContent('2');
    await act(() => fireEvent.click(notebooksCountBadge));

    const notebookItems = screen.getAllByTestId('connections-delete-notebooks-item');
    expect(notebookItems).toHaveLength(2);
    expect(notebookItems[0]).toHaveTextContent('Connected notebook (Running)');
    expect(notebookItems[1]).toHaveTextContent('Another notebook');

    const modelsCountBadge = screen.getByTestId('connections-delete-models-count');
    expect(modelsCountBadge).toHaveTextContent('2');
    await act(() => fireEvent.click(modelsCountBadge));

    const modelsItems = screen.getAllByTestId('connections-delete-models-item');
    expect(modelsItems).toHaveLength(2);
    expect(modelsItems[0]).toHaveTextContent('KServe model');
    expect(modelsItems[1]).toHaveTextContent('LLM-D model');
  });

  it('should not show empty related resources', async () => {
    const deleteConnection = mockConnection({ displayName: 'connection1', description: 'desc1' });

    useRelatedNotebooksMock.mockReturnValue({
      notebooks: [],
      loaded: true,
    });
    render(
      <ConnectionsDeleteModal
        namespace={deleteConnection.metadata.namespace}
        deleteConnection={deleteConnection}
        connectedResources={[]}
        connectedResourcesLoaded
        onClose={onClose}
      />,
    );

    const notebooksCountBadge = screen.queryByTestId('connections-delete-notebooks-toggle');
    expect(notebooksCountBadge).toBeFalsy();

    const modelsCountBadge = screen.queryByTestId('connections-delete-models-toggle');
    expect(modelsCountBadge).toBeFalsy();
  });
});
