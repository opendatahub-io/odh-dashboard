import { InferenceServiceKind, ProjectKind } from '#~/k8sTypes';
import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getInferenceServiceStoppedStatus } from '#~/pages/modelServing/utils';

export enum ColumnField {
  Expand = 'expand',
  Name = 'name',
  Project = 'project',
  Endpoint = 'endpoint',
  ServingRuntime = 'servingRuntime',
  ApiProtocol = 'apiProtocol',
  LastDeployed = 'lastDeployed',
  Status = 'status',
  Kebab = 'kebab',
  Token = 'token',
}

const COL_EXPAND: SortableData<InferenceServiceKind> = {
  field: ColumnField.Expand,
  label: '',
  sortable: false,
};
const COL_NAME: SortableData<InferenceServiceKind> = {
  field: ColumnField.Name,
  label: 'Model deployment name',
  width: 20,
  sortable: (a, b) =>
    getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
};
const buildProjectCol = (projects: ProjectKind[]): SortableData<InferenceServiceKind> => ({
  field: ColumnField.Project,
  label: 'Project',
  width: 20,
  sortable: (a, b) => {
    const projectA = projects.find(({ metadata: { name } }) => name === a.metadata.namespace);
    const projectB = projects.find(({ metadata: { name } }) => name === b.metadata.namespace);
    // These should never legit happen -- if they do, let us try to sort as smart as we can
    if (!projectA && !projectB) {
      return 0;
    }
    if (!projectA) {
      return -1;
    }
    if (!projectB) {
      return 1;
    }

    // Properly sort by display name
    return getDisplayNameFromK8sResource(projectA).localeCompare(
      getDisplayNameFromK8sResource(projectB),
    );
  },
});
const COL_ENDPOINT: SortableData<InferenceServiceKind> = {
  field: ColumnField.Endpoint,
  label: 'Inference endpoints',
  width: 45,
  sortable: false,
};

const COL_SERVING_RUNTIME: SortableData<InferenceServiceKind> = {
  field: ColumnField.ServingRuntime,
  label: 'Serving runtime',
  width: 20,
  sortable: false,
};

const COL_API_PROTOCOL: SortableData<InferenceServiceKind> = {
  field: ColumnField.ApiProtocol,
  label: 'API protocol',
  width: 10,
  sortable: false,
};

const COL_LAST_DEPLOYED: SortableData<InferenceServiceKind> = {
  field: ColumnField.LastDeployed,
  label: 'Last deployed',
  width: 15,
  sortable: (a, b) => {
    // Only check if service is stopped (no ModelMesh)
    const aInactive = getInferenceServiceStoppedStatus(a).isStopped;
    const bInactive = getInferenceServiceStoppedStatus(b).isStopped;

    if (aInactive && !bInactive) {
      return 1;
    }
    if (!aInactive && bInactive) {
      return -1;
    }

    const aReadyCondition = (a.status?.conditions || []).find((c) => c.type === 'Ready');
    const bReadyCondition = (b.status?.conditions || []).find((c) => c.type === 'Ready');
    const aTimestamp = aReadyCondition?.lastTransitionTime ?? a.metadata.creationTimestamp;
    const bTimestamp = bReadyCondition?.lastTransitionTime ?? b.metadata.creationTimestamp;

    return new Date(bTimestamp ?? '').getTime() - new Date(aTimestamp ?? '').getTime();
  },
};

const COL_STATUS: SortableData<InferenceServiceKind> = {
  field: ColumnField.Status,
  label: 'Status',
  width: 10,
  sortable: false,
};
const COL_KEBAB: SortableData<InferenceServiceKind> = {
  field: ColumnField.Kebab,
  label: '',
  sortable: false,
};
export const getGlobalInferenceServiceColumns = (
  projects: ProjectKind[],
): SortableData<InferenceServiceKind>[] => [
  COL_NAME,
  buildProjectCol(projects),
  COL_SERVING_RUNTIME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_LAST_DEPLOYED,
  COL_STATUS,
  COL_KEBAB,
];

export const getVersionDetailsInferenceServiceColumns = (
  projects: ProjectKind[],
): SortableData<InferenceServiceKind>[] => [
  { ...COL_NAME, label: 'Model deployment name' },
  buildProjectCol(projects),
  COL_SERVING_RUNTIME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_LAST_DEPLOYED,
  COL_STATUS,
  COL_KEBAB,
];

export const getProjectInferenceServiceColumns = (): SortableData<InferenceServiceKind>[] => [
  COL_NAME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_LAST_DEPLOYED,
  COL_STATUS,
  COL_KEBAB,
];
export const getKServeInferenceServiceColumns = (): SortableData<InferenceServiceKind>[] => [
  COL_EXPAND,
  COL_NAME,
  COL_SERVING_RUNTIME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_LAST_DEPLOYED,
  COL_STATUS,
  COL_KEBAB,
];
