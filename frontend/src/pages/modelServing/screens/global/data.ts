import { InferenceServiceKind, ProjectKind, SecretKind } from '~/k8sTypes';
import { SortableData } from '~/components/table';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { getInferenceServiceDisplayName, getTokenDisplayName } from './utils';

const COL_EXPAND: SortableData<InferenceServiceKind> = {
  field: 'expand',
  label: '',
  sortable: false,
};
const COL_NAME: SortableData<InferenceServiceKind> = {
  field: 'name',
  label: 'Model name',
  width: 20,
  sortable: (a, b) =>
    getInferenceServiceDisplayName(a).localeCompare(getInferenceServiceDisplayName(b)),
};
const buildProjectCol = (projects: ProjectKind[]): SortableData<InferenceServiceKind> => ({
  field: 'project',
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
    return getProjectDisplayName(projectA).localeCompare(getProjectDisplayName(projectB));
  },
});
const COL_ENDPOINT: SortableData<InferenceServiceKind> = {
  field: 'endpoint',
  label: 'Inference endpoint',
  width: 45,
  sortable: false,
};

const COL_SERVING_RUNTIME: SortableData<InferenceServiceKind> = {
  field: 'servingRuntime',
  label: 'Serving runtime',
  width: 20,
  sortable: false,
};

const COL_API_PROTOCOL: SortableData<InferenceServiceKind> = {
  field: 'apiProtocol',
  label: 'API protocol',
  width: 10,
  sortable: false,
};

const COL_STATUS: SortableData<InferenceServiceKind> = {
  field: 'status',
  label: 'Status',
  width: 10,
  sortable: false,
};
const COL_KEBAB: SortableData<InferenceServiceKind> = {
  field: 'kebab',
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
  COL_STATUS,
  COL_KEBAB,
];
export const getProjectInferenceServiceColumns = (): SortableData<InferenceServiceKind>[] => [
  COL_NAME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_STATUS,
  COL_KEBAB,
];
export const getKServeInferenceServiceColumns = (): SortableData<InferenceServiceKind>[] => [
  COL_EXPAND,
  COL_NAME,
  COL_SERVING_RUNTIME,
  COL_ENDPOINT,
  COL_API_PROTOCOL,
  COL_STATUS,
  COL_KEBAB,
];

export const tokenColumns: SortableData<SecretKind>[] = [
  {
    field: 'name',
    label: 'Token name',
    width: 20,
    sortable: (a, b) => getTokenDisplayName(a).localeCompare(getTokenDisplayName(b)),
  },
  {
    field: 'token',
    label: 'Token secret',
    width: 80,
    sortable: false,
  },
];
