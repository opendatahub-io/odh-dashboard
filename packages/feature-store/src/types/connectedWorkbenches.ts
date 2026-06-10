export type ConnectedWorkbenchEntry = {
  workbenchName: string;
  workbenchNamespace: string;
  projectName: string;
};

export type FeastProjectWithWorkbenches = {
  feastProjectName: string;
  namespace: string;
  description?: string;
  permissionLevel: string[];
  connectedWorkbenches: ConnectedWorkbenchEntry[];
};

export type ConnectedWorkbenchesResponse = {
  connectedWorkbenches: FeastProjectWithWorkbenches[];
};

/** One row in the Connected Workbenches modal table. */
export type ConnectedWorkbenchTableRow = {
  id: string;
  workbenchName?: string;
  workbenchNamespace?: string;
  authorizedProject: string;
  permissionLevel: string[];
  hasConnectedWorkbench: boolean;
};
