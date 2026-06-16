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
  describe('initial state', () => {
    it('should return all rows unfiltered', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);
      const state = renderResult.result.current;

      expect(state.filteredRows).toEqual(mockRows);
      expect(state.workbenchNameFilter).toBe('');
      expect(state.selectedProjects).toEqual([]);
      expect(state.selectedPermissions).toEqual([]);
      expect(state.hideProjectsWithConnectedWorkbenches).toBe(false);
      expect(state.hasActiveFilters).toBe(false);
    });
  });

  describe('projectOptions', () => {
    it('should group projects by connected workbench status', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);
      const { projectOptions } = renderResult.result.current;

      expect(projectOptions.withConnected).toEqual(['project-a', 'project-b']);
      expect(projectOptions.withoutConnected).toEqual(['project-c']);
    });

    it('should exclude projects from "without" that also appear in "with"', () => {
      const rows = [
        createRow({
          id: 'row-1',
          authorizedProject: 'shared-project',
          hasConnectedWorkbench: true,
        }),
        createRow({
          id: 'row-2',
          authorizedProject: 'shared-project',
          hasConnectedWorkbench: false,
        }),
      ];
      const renderResult = testHook(useConnectedWorkbenchFilters)(rows);
      const { projectOptions } = renderResult.result.current;

      expect(projectOptions.withConnected).toEqual(['shared-project']);
      expect(projectOptions.withoutConnected).toEqual([]);
    });

    it('should sort project names alphabetically', () => {
      const rows = [
        createRow({ id: 'r1', authorizedProject: 'z-project', hasConnectedWorkbench: true }),
        createRow({ id: 'r2', authorizedProject: 'a-project', hasConnectedWorkbench: true }),
        createRow({ id: 'r3', authorizedProject: 'm-project', hasConnectedWorkbench: false }),
      ];
      const renderResult = testHook(useConnectedWorkbenchFilters)(rows);
      const { projectOptions } = renderResult.result.current;

      expect(projectOptions.withConnected).toEqual(['a-project', 'z-project']);
      expect(projectOptions.withoutConnected).toEqual(['m-project']);
    });

    it('should return empty groups for no rows', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)([]);
      const { projectOptions } = renderResult.result.current;

      expect(projectOptions.withConnected).toEqual([]);
      expect(projectOptions.withoutConnected).toEqual([]);
    });
  });

  describe('workbench name filter', () => {
    it('should filter rows by workbench name', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

      act(() => {
        renderResult.result.current.setWorkbenchNameFilter('alpha');
      });

      expect(renderResult.result.current.filteredRows).toHaveLength(1);
      expect(renderResult.result.current.filteredRows[0].id).toBe('row-1');
      expect(renderResult.result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('project filter', () => {
    it('should toggle projects on and off', () => {
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
  });

  describe('permission filter', () => {
    it('should toggle permissions on and off', () => {
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
  });

  describe('hide projects toggle', () => {
    it('should hide rows with connected workbenches', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

      act(() => {
        renderResult.result.current.setHideProjectsWithConnectedWorkbenches(true);
      });

      expect(renderResult.result.current.filteredRows).toHaveLength(1);
      expect(renderResult.result.current.filteredRows[0].id).toBe('row-3');
    });
  });

  describe('AND combination', () => {
    it('should combine name and project filters', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

      act(() => {
        renderResult.result.current.setWorkbenchNameFilter('notebook');
        renderResult.result.current.toggleProject('project-a');
      });

      expect(renderResult.result.current.filteredRows).toHaveLength(1);
      expect(renderResult.result.current.filteredRows[0].id).toBe('row-1');
    });
  });

  describe('clearAllFilters', () => {
    it('should reset all filters but not the hide toggle', () => {
      const renderResult = testHook(useConnectedWorkbenchFilters)(mockRows);

      act(() => {
        renderResult.result.current.setWorkbenchNameFilter('alpha');
        renderResult.result.current.toggleProject('project-a');
        renderResult.result.current.togglePermission('Read');
        renderResult.result.current.setHideProjectsWithConnectedWorkbenches(true);
      });

      act(() => {
        renderResult.result.current.clearAllFilters();
      });

      expect(renderResult.result.current.workbenchNameFilter).toBe('');
      expect(renderResult.result.current.selectedProjects).toEqual([]);
      expect(renderResult.result.current.selectedPermissions).toEqual([]);
      expect(renderResult.result.current.hideProjectsWithConnectedWorkbenches).toBe(true);
      expect(renderResult.result.current.hasActiveFilters).toBe(false);
    });
  });
});
