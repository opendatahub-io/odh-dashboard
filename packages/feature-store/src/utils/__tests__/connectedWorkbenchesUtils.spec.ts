import type { ConnectedWorkbenchTableRow } from '../../types/connectedWorkbenches';
import {
  filterConnectedWorkbenchRows,
  type ConnectedWorkbenchFilters,
} from '../connectedWorkbenchesUtils';

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

const emptyFilters: ConnectedWorkbenchFilters = {
  workbenchName: '',
  projects: [],
  permissions: [],
};

describe('filterConnectedWorkbenchRows', () => {
  const rows: ConnectedWorkbenchTableRow[] = [
    createRow({
      id: 'row-1',
      workbenchName: 'notebook-alpha',
      authorizedProject: 'project-a',
      permissionLevel: ['Create', 'Read', 'Update'],
    }),
    createRow({
      id: 'row-2',
      workbenchName: 'notebook-beta',
      authorizedProject: 'project-b',
      permissionLevel: ['Read', 'Delete'],
    }),
    createRow({
      id: 'row-3',
      workbenchName: undefined,
      authorizedProject: 'project-c',
      permissionLevel: ['Write', 'Read_offline'],
      hasConnectedWorkbench: false,
    }),
    createRow({
      id: 'row-4',
      workbenchName: 'alpha-runner',
      authorizedProject: 'project-a',
      permissionLevel: ['Describe'],
    }),
  ];

  describe('with no filters', () => {
    it('should return all rows when no filters are active', () => {
      expect(filterConnectedWorkbenchRows(rows, emptyFilters)).toEqual(rows);
    });

    it('should return empty array when input is empty', () => {
      expect(filterConnectedWorkbenchRows([], emptyFilters)).toEqual([]);
    });
  });

  describe('workbench name filter', () => {
    it('should filter by workbench name substring', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        workbenchName: 'alpha',
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-4']);
    });

    it('should be case-insensitive', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        workbenchName: 'BETA',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('row-2');
    });

    it('should exclude rows with no workbench name', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        workbenchName: 'notebook',
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-2']);
    });

    it('should return empty when no rows match', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        workbenchName: 'nonexistent',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('project filter', () => {
    it('should filter by single project', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        projects: ['project-b'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('row-2');
    });

    it('should filter by multiple projects', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        projects: ['project-a', 'project-c'],
      });
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-3', 'row-4']);
    });

    it('should return empty when no projects match', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        projects: ['project-z'],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('permission filter', () => {
    it('should filter by single permission', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        permissions: ['Create'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('row-1');
    });

    it('should filter by multiple permissions (OR within permissions)', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        permissions: ['Delete', 'Write'],
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-2', 'row-3']);
    });

    it('should match rows that have at least one selected permission', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        permissions: ['Read'],
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-2']);
    });

    it('should return empty when no rows match the permission', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        ...emptyFilters,
        permissions: ['Write_online'],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('AND combination', () => {
    it('should combine name and project filters with AND', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        workbenchName: 'alpha',
        projects: ['project-a'],
        permissions: [],
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-4']);
    });

    it('should combine name and permission filters with AND', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        workbenchName: 'notebook',
        projects: [],
        permissions: ['Read'],
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-2']);
    });

    it('should combine project and permission filters with AND', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        workbenchName: '',
        projects: ['project-a'],
        permissions: ['Create'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('row-1');
    });

    it('should combine all three filters with AND', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        workbenchName: 'notebook',
        projects: ['project-a', 'project-b'],
        permissions: ['Read'],
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['row-1', 'row-2']);
    });

    it('should return empty when AND combination excludes all rows', () => {
      const result = filterConnectedWorkbenchRows(rows, {
        workbenchName: 'alpha',
        projects: ['project-b'],
        permissions: [],
      });
      expect(result).toHaveLength(0);
    });
  });
});
