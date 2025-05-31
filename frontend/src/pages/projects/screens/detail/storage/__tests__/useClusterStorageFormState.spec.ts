import { act } from 'react';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import useClusterStorageFormState from '#~/pages/projects/screens/detail/storage/useClusterStorageFormState';
import { mockNotebookK8sResource } from '#~/__mocks__';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';

describe('useClusterStorageFormState', () => {
  it('should set notebookData correctly when connectedNotebooks and existingPvc are provided', () => {
    const renderResult = testHook(useClusterStorageFormState)(
      [mockNotebookK8sResource({})],
      mockPVCK8sResource({}),
    );

    expect(renderResult.result.current.notebookData).toEqual([
      {
        existingPvc: true,
        isUpdatedValue: false,
        mountPath: { error: '', value: undefined },
        name: 'test-notebook',
        notebookDisplayName: 'Test Notebook',
      },
    ]);

    act(() => {
      renderResult.result.current.setNotebookData([
        {
          name: 'notebook3',
          notebookDisplayName: 'Notebook 3',
          mountPath: {
            value: '/mnt/data/pvc3',
            error: '',
          },
          existingPvc: true,
          isUpdatedValue: false,
        },
      ]);
    });

    expect(renderResult.result.current.notebookData).toEqual([
      {
        name: 'notebook3',
        notebookDisplayName: 'Notebook 3',
        mountPath: {
          value: '/mnt/data/pvc3',
          error: '',
        },
        existingPvc: true,
        isUpdatedValue: false,
      },
    ]);
  });

  it('should set notebookData to an empty array when no connectedNotebooks are provided', () => {
    const renderResult = testHook(useClusterStorageFormState)([]);

    expect(renderResult.result.current.notebookData).toEqual([]);
  });
});
