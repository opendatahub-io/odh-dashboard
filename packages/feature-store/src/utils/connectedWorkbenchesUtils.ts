import {
  ConnectedWorkbenchTableRow,
  FeastProjectWithWorkbenches,
} from '../types/connectedWorkbenches';

export const buildConnectedWorkbenchRows = (
  project: FeastProjectWithWorkbenches | undefined,
): ConnectedWorkbenchTableRow[] => {
  if (!project) {
    return [];
  }

  const seen = new Set<string>();
  const rows: ConnectedWorkbenchTableRow[] = [];

  for (const workbench of project.connectedWorkbenches) {
    const key = `${workbench.projectName}-${workbench.workbenchName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      id: key,
      workbenchName: workbench.workbenchName,
      authorizedProject: workbench.projectName,
      permissionLevel: project.permissionLevel,
      hasConnectedWorkbench: true,
    });
  }

  return rows.toSorted((a, b) => {
    if (a.hasConnectedWorkbench && !b.hasConnectedWorkbench) {
      return -1;
    }
    if (!a.hasConnectedWorkbench && b.hasConnectedWorkbench) {
      return 1;
    }
    return 0;
  });
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
