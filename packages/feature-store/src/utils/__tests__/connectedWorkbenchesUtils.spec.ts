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

  it('should return all rows when no filters are active, and empty array for empty input', () => {
    expect(filterConnectedWorkbenchRows(rows, emptyFilters)).toEqual(rows);
    expect(filterConnectedWorkbenchRows([], emptyFilters)).toEqual([]);
  });

  it('should filter by workbench name (case-insensitive, substring, excludes unnamed)', () => {
    const alpha = filterConnectedWorkbenchRows(rows, { ...emptyFilters, workbenchName: 'alpha' });
    expect(alpha.map((r) => r.id)).toEqual(['row-1', 'row-4']);

    const beta = filterConnectedWorkbenchRows(rows, { ...emptyFilters, workbenchName: 'BETA' });
    expect(beta.map((r) => r.id)).toEqual(['row-2']);

    const notebook = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      workbenchName: 'notebook',
    });
    expect(notebook).toHaveLength(2);

    const none = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      workbenchName: 'nonexistent',
    });
    expect(none).toHaveLength(0);
  });

  it('should filter by single and multiple projects', () => {
    const single = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      projects: ['project-b'],
    });
    expect(single.map((r) => r.id)).toEqual(['row-2']);

    const multi = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      projects: ['project-a', 'project-c'],
    });
    expect(multi.map((r) => r.id)).toEqual(['row-1', 'row-3', 'row-4']);

    const noMatch = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      projects: ['project-z'],
    });
    expect(noMatch).toHaveLength(0);
  });

  it('should filter by permissions (OR within, case-insensitive)', () => {
    const single = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      permissions: ['Create'],
    });
    expect(single.map((r) => r.id)).toEqual(['row-1']);

    const multi = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      permissions: ['Delete', 'Write'],
    });
    expect(multi.map((r) => r.id)).toEqual(['row-2', 'row-3']);

    const caseInsensitive = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      permissions: ['create'],
    });
    expect(caseInsensitive.map((r) => r.id)).toEqual(['row-1']);

    const noMatch = filterConnectedWorkbenchRows(rows, {
      ...emptyFilters,
      permissions: ['Write_online'],
    });
    expect(noMatch).toHaveLength(0);
  });

  it('should combine all filters with AND logic', () => {
    expect(
      filterConnectedWorkbenchRows(rows, {
        workbenchName: 'alpha',
        projects: ['project-a'],
        permissions: [],
      }).map((r) => r.id),
    ).toEqual(['row-1', 'row-4']);

    expect(
      filterConnectedWorkbenchRows(rows, {
        workbenchName: '',
        projects: ['project-a'],
        permissions: ['Create'],
      }).map((r) => r.id),
    ).toEqual(['row-1']);

    expect(
      filterConnectedWorkbenchRows(rows, {
        workbenchName: 'notebook',
        projects: ['project-a', 'project-b'],
        permissions: ['Read'],
      }).map((r) => r.id),
    ).toEqual(['row-1', 'row-2']);

    expect(
      filterConnectedWorkbenchRows(rows, {
        workbenchName: 'alpha',
        projects: ['project-b'],
        permissions: [],
      }),
    ).toHaveLength(0);
  });
});
