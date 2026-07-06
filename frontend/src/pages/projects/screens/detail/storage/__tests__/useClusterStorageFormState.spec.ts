import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useClusterStorageFormState from '#~/pages/projects/screens/detail/storage/useClusterStorageFormState';
import { mockNotebookK8sResource } from '#~/__mocks__';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';

describe('useClusterStorageFormState', () => {
  it('should set notebookData correctly when connectedNotebooks and existingPvc are provided', () => {
    const renderResult = testHook(useClusterStorageFormState)(
      [mockNotebookK8sResource({})],
      true,
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
    const renderResult = testHook(useClusterStorageFormState)([], true);

    expect(renderResult.result.current.notebookData).toEqual([]);
  });

  it('should not overwrite user edits when connectedNotebooks reference changes (poll refresh)', () => {
    const notebook = mockNotebookK8sResource({});
    const pvc = mockPVCK8sResource({});

    const renderResult = testHook(useClusterStorageFormState)([notebook], true, pvc);

    expect(renderResult.result.current.notebookData).toHaveLength(1);
    expect(renderResult.result.current.notebookData[0].name).toBe('test-notebook');

    act(() => {
      renderResult.result.current.setNotebookData([
        ...renderResult.result.current.notebookData,
        {
          name: 'user-added-notebook',
          mountPath: { value: '/opt/app-root/src/data', error: '' },
          existingPvc: false,
          isUpdatedValue: false,
          newRowId: 1,
        },
      ]);
    });

    expect(renderResult.result.current.notebookData).toHaveLength(2);

    renderResult.rerender([mockNotebookK8sResource({})], true, pvc);

    expect(renderResult.result.current.notebookData).toHaveLength(2);
    expect(renderResult.result.current.notebookData[1].name).toBe('user-added-notebook');
  });

  it('should not initialize data before loaded is true', () => {
    const pvc = mockPVCK8sResource({});

    const renderResult = testHook(useClusterStorageFormState)(
      [mockNotebookK8sResource({})],
      false,
      pvc,
    );

    expect(renderResult.result.current.notebookData).toEqual([]);
  });

  it('should initialize data once loaded becomes true', () => {
    const pvc = mockPVCK8sResource({});

    const renderResult = testHook(useClusterStorageFormState)([], false, pvc);

    expect(renderResult.result.current.notebookData).toEqual([]);

    renderResult.rerender([mockNotebookK8sResource({})], true, pvc);

    expect(renderResult.result.current.notebookData).toEqual([
      {
        existingPvc: true,
        isUpdatedValue: false,
        mountPath: { error: '', value: undefined },
        name: 'test-notebook',
        notebookDisplayName: 'Test Notebook',
      },
    ]);
  });

  it('should not overwrite user edits when loaded with zero connected notebooks', () => {
    const pvc = mockPVCK8sResource({});

    const renderResult = testHook(useClusterStorageFormState)([], true, pvc);

    expect(renderResult.result.current.notebookData).toEqual([]);

    act(() => {
      renderResult.result.current.setNotebookData([
        {
          name: 'user-added-notebook',
          mountPath: { value: '/opt/app-root/src/data', error: '' },
          existingPvc: false,
          isUpdatedValue: false,
          newRowId: 1,
        },
      ]);
    });

    expect(renderResult.result.current.notebookData).toHaveLength(1);

    renderResult.rerender([mockNotebookK8sResource({})], true, pvc);

    expect(renderResult.result.current.notebookData).toHaveLength(1);
    expect(renderResult.result.current.notebookData[0].name).toBe('user-added-notebook');
  });
});
