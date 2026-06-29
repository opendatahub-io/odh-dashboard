import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ConnectedWorkbenchTableRow } from '../../../types/connectedWorkbenches';
import useConnectedWorkbenchFilters from '../useConnectedWorkbenchFilters';

const createRow = (
  overrides: Partial<ConnectedWorkbenchTableRow> = {},
): ConnectedWorkbenchTableRow => ({
  id: 'test-row',
  authorizedProject: 'project-a',
  permissionLevel: ['Read', 'Write'],
  hasConnectedWorkbench: true,
  workbenchName: 'my-workbench',
  workbenchNamespace: 'project-a',
  ...overrides,
});

const mockRows: ConnectedWorkbenchTableRow[] = [
  createRow({
    id: 'row-1',
    workbenchName: 'notebook-alpha',
    authorizedProject: 'project-a',
    permissionLevel: ['Create', 'Read'],
    hasConnectedWorkbench: true,
  }),
  createRow({
    id: 'row-2',
    workbenchName: 'notebook-beta',
    authorizedProject: 'project-b',
    permissionLevel: ['Read', 'Delete'],
    hasConnectedWorkbench: true,
  }),
  createRow({
    id: 'row-3',
    workbenchName: undefined,
    authorizedProject: 'project-c',
    permissionLevel: ['Write'],
    hasConnectedWorkbench: false,
  }),
];

describe('useConnectedWorkbenchFilters', () => {
  it('should return all rows unfiltered with correct initial state', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);
    const state = renderResult.result.current;

    expect(state.filteredRows).toEqual(mockRows);
    expect(state.workbenchNameFilter).toBe('');
    expect(state.selectedProjects).toEqual([]);
    expect(state.selectedPermissions).toEqual([]);
    expect(state.hideProjectsWithConnectedWorkbenches).toBe(false);
    expect(state.hasActiveFilters).toBe(false);
  });

  it('should group projects by connected status, sort alphabetically, and exclude overlap', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);
    const { projectOptions } = renderResult.result.current;
    expect(projectOptions.withConnected).toEqual(['project-a', 'project-b']);
    expect(projectOptions.withoutConnected).toEqual(['project-c']);

    const overlapRows = [
      createRow({ id: 'r1', authorizedProject: 'shared', hasConnectedWorkbench: true }),
      createRow({ id: 'r2', authorizedProject: 'shared', hasConnectedWorkbench: false }),
    ];
    const overlapResult = testHook(useConnectedWorkbenchFilters)(overlapRows);
    expect(overlapResult.result.current.projectOptions.withConnected).toEqual(['shared']);
    expect(overlapResult.result.current.projectOptions.withoutConnected).toEqual([]);

    const emptyResult = testHook(useConnectedWorkbenchFilters)([]);
    expect(emptyResult.result.current.projectOptions.withConnected).toEqual([]);
    expect(emptyResult.result.current.projectOptions.withoutConnected).toEqual([]);
  });

  it('should filter by workbench name and set hasActiveFilters', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.setWorkbenchNameFilter('alpha');
    });

    expect(renderResult.result.current.filteredRows).toHaveLength(1);
    expect(renderResult.result.current.filteredRows[0].id).toBe('row-1');
    expect(renderResult.result.current.hasActiveFilters).toBe(true);
  });

  it('should toggle projects on/off and filter rows accordingly', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.toggleProject('project-a');
    });
    expect(renderResult.result.current.selectedProjects).toEqual(['project-a']);
    expect(renderResult.result.current.filteredRows).toHaveLength(1);

    act(() => {
      renderResult.result.current.toggleProject('project-a');
    });
    expect(renderResult.result.current.selectedProjects).toEqual([]);
    expect(renderResult.result.current.filteredRows).toEqual(mockRows);
  });

  it('should toggle permissions on/off and filter rows accordingly', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.togglePermission('Create');
    });
    expect(renderResult.result.current.selectedPermissions).toEqual(['Create']);
    expect(renderResult.result.current.filteredRows).toHaveLength(1);
    expect(renderResult.result.current.filteredRows[0].id).toBe('row-1');

    act(() => {
      renderResult.result.current.togglePermission('Create');
    });
    expect(renderResult.result.current.selectedPermissions).toEqual([]);
    expect(renderResult.result.current.filteredRows).toEqual(mockRows);
  });

  it('should hide rows with connected workbenches when toggle is on and set hasActiveFilters', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.setHideProjectsWithConnectedWorkbenches(true);
    });

    expect(renderResult.result.current.filteredRows).toHaveLength(1);
    expect(renderResult.result.current.filteredRows[0].id).toBe('row-3');
    expect(renderResult.result.current.hasActiveFilters).toBe(true);
  });

  it('should combine name and project filters with AND logic', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.setWorkbenchNameFilter('notebook');
      renderResult.result.current.toggleProject('project-a');
    });

    expect(renderResult.result.current.filteredRows).toHaveLength(1);
    expect(renderResult.result.current.filteredRows[0].id).toBe('row-1');
  });

  it('should reset all filters including the hide toggle on clearAllFilters', () => {
    const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

    act(() => {
      renderResult.result.current.setWorkbenchNameFilter('alpha');
      renderResult.result.current.toggleProject('project-a');
      renderResult.result.current.togglePermission('Read');
      renderResult.result.current.setHideProjectsWithConnectedWorkbenches(true);
    });

    expect(renderResult.result.current.hasActiveFilters).toBe(true);

    act(() => {
      renderResult.result.current.clearAllFilters();
    });

    expect(renderResult.result.current.workbenchNameFilter).toBe('');
    expect(renderResult.result.current.selectedProjects).toEqual([]);
    expect(renderResult.result.current.selectedPermissions).toEqual([]);
    expect(renderResult.result.current.hideProjectsWithConnectedWorkbenches).toBe(false);
    expect(renderResult.result.current.hasActiveFilters).toBe(false);
  });
});
