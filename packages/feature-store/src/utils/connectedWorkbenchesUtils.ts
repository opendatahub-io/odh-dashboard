import {
  ConnectedWorkbenchTableRow,
  FeastProjectWithWorkbenches,
} from '../types/connectedWorkbenches';

const sortConnectedWorkbenchRows = (
  rows: ConnectedWorkbenchTableRow[],
): ConnectedWorkbenchTableRow[] =>
  rows.toSorted((a, b) => {
    if (a.hasConnectedWorkbench && !b.hasConnectedWorkbench) {
      return -1;
    }
    if (!a.hasConnectedWorkbench && b.hasConnectedWorkbench) {
      return 1;
    }
    return 0;
  });

const buildRowsForProject = (
  project: FeastProjectWithWorkbenches,
): ConnectedWorkbenchTableRow[] => {
  if (project.connectedWorkbenches.length === 0) {
    return [
      {
        id: `${project.feastProjectName}-no-workbench`,
        authorizedProject: project.namespace,
        permissionLevel: project.permissionLevel,
        hasConnectedWorkbench: false,
      },
    ];
  }

  const seenRowIds = new Set<string>();
  const rows: ConnectedWorkbenchTableRow[] = [];

  for (const workbench of project.connectedWorkbenches) {
    const rowId = `${project.feastProjectName}-${workbench.projectName}-${workbench.workbenchName}`;
    if (seenRowIds.has(rowId)) {
      continue;
    }
    seenRowIds.add(rowId);
    rows.push({
      id: rowId,
      workbenchName: workbench.workbenchName,
      workbenchNamespace: workbench.workbenchNamespace,
      authorizedProject: workbench.projectName,
      permissionLevel: project.permissionLevel,
      hasConnectedWorkbench: Boolean(workbench.workbenchName),
    });
  }

  return rows;
};

export const buildConnectedWorkbenchRows = (
  projects: FeastProjectWithWorkbenches | FeastProjectWithWorkbenches[] | undefined,
): ConnectedWorkbenchTableRow[] => {
  if (!projects) {
    return [];
  }

  const projectList = Array.isArray(projects) ? projects : [projects];
  return sortConnectedWorkbenchRows(projectList.flatMap(buildRowsForProject));
};

export const filterRowsByToggle = (
  rows: ConnectedWorkbenchTableRow[],
  hideProjectsWithConnectedWorkbenches: boolean,
): ConnectedWorkbenchTableRow[] => {
  if (!hideProjectsWithConnectedWorkbenches) {
    return rows;
  }
  return rows.filter((row) => !row.hasConnectedWorkbench);
};

export type ConnectedWorkbenchFilters = {
  workbenchName: string;
  projects: string[];
  permissions: string[];
};

export const filterConnectedWorkbenchRows = (
  rows: ConnectedWorkbenchTableRow[],
  filters: ConnectedWorkbenchFilters,
): ConnectedWorkbenchTableRow[] => {
  const { workbenchName, projects, permissions } = filters;
  if (!workbenchName && projects.length === 0 && permissions.length === 0) {
    return rows;
  }

  const nameLower = workbenchName.toLowerCase();

  return rows.filter((row) => {
    if (nameLower && !(row.workbenchName ?? '').toLowerCase().includes(nameLower)) {
      return false;
    }
    if (projects.length > 0 && !projects.includes(row.authorizedProject)) {
      return false;
    }
    if (
      permissions.length > 0 &&
      !permissions.some((p) =>
        row.permissionLevel.some((rp) => rp.toLowerCase() === p.toLowerCase()),
      )
    ) {
      return false;
    }
    return true;
  });
};
