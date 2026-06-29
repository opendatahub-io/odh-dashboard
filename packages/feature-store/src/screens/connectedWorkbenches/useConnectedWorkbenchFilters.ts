import * as React from 'react';
import type { ConnectedWorkbenchTableRow } from '../../types/connectedWorkbenches';
import {
  filterConnectedWorkbenchRows,
  filterRowsByToggle,
} from '../../utils/connectedWorkbenchesUtils';

export type GroupedProjectOptions = {
  withConnected: string[];
  withoutConnected: string[];
};

export type UseConnectedWorkbenchFiltersReturn = {
  workbenchNameFilter: string;
  selectedProjects: string[];
  selectedPermissions: string[];
  hideProjectsWithConnectedWorkbenches: boolean;
  filteredRows: ConnectedWorkbenchTableRow[];
  projectOptions: GroupedProjectOptions;
  setWorkbenchNameFilter: (value: string) => void;
  toggleProject: (project: string) => void;
  togglePermission: (permission: string) => void;
  setHideProjectsWithConnectedWorkbenches: (hide: boolean) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
};

const useConnectedWorkbenchFilters = (
  rows: ConnectedWorkbenchTableRow[],
): UseConnectedWorkbenchFiltersReturn => {
  const [workbenchNameFilter, setWorkbenchNameFilter] = React.useState('');
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [hideProjectsWithConnectedWorkbenches, setHideProjectsWithConnectedWorkbenches] =
    React.useState(false);

  const projectOptions = React.useMemo<GroupedProjectOptions>(() => {
    const withConnected = new Set<string>();
    const withoutConnected = new Set<string>();
    for (const row of rows) {
      if (row.hasConnectedWorkbench) {
        withConnected.add(row.authorizedProject);
      } else {
        withoutConnected.add(row.authorizedProject);
      }
    }
    return {
      withConnected: [...withConnected].toSorted(),
      withoutConnected: [...withoutConnected].filter((p) => !withConnected.has(p)).toSorted(),
    };
  }, [rows]);

  const toggleProject = React.useCallback((project: string) => {
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project],
    );
  }, []);

  const togglePermission = React.useCallback((permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setWorkbenchNameFilter('');
    setSelectedProjects([]);
    setSelectedPermissions([]);
    setHideProjectsWithConnectedWorkbenches(false);
  }, []);

  const hasActiveFilters =
    workbenchNameFilter.length > 0 ||
    selectedProjects.length > 0 ||
    selectedPermissions.length > 0 ||
    hideProjectsWithConnectedWorkbenches;

  const filteredRows = React.useMemo(() => {
    const toggleFiltered = filterRowsByToggle(rows, hideProjectsWithConnectedWorkbenches);
    return filterConnectedWorkbenchRows(toggleFiltered, {
      workbenchName: workbenchNameFilter,
      projects: selectedProjects,
      permissions: selectedPermissions,
    });
  }, [
    rows,
    hideProjectsWithConnectedWorkbenches,
    workbenchNameFilter,
    selectedProjects,
    selectedPermissions,
  ]);

  return {
    workbenchNameFilter,
    selectedProjects,
    selectedPermissions,
    hideProjectsWithConnectedWorkbenches,
    filteredRows,
    projectOptions,
    setWorkbenchNameFilter,
    toggleProject,
    togglePermission,
    setHideProjectsWithConnectedWorkbenches,
    clearAllFilters,
    hasActiveFilters,
  };
};

export default useConnectedWorkbenchFilters;
