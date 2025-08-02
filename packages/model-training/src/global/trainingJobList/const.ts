import { SortableData } from '@odh-dashboard/internal/components/table/index';
import { PyTorchJobKind } from '../../k8sTypes';
import { getJobStatus } from './utils';

export const columns: SortableData<PyTorchJobKind>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 20,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number =>
      (a.metadata.annotations?.['opendatahub.io/display-name'] || a.metadata.name).localeCompare(
        b.metadata.annotations?.['opendatahub.io/display-name'] || b.metadata.name,
      ),
  },
  {
    field: 'project',
    label: 'Project',
    width: 20,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number =>
      a.metadata.namespace.localeCompare(b.metadata.namespace),
  },
  {
    field: 'replicas',
    label: 'Master/Worker',
    width: 15,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number => {
      const aMaster = a.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const aWorker = a.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
      const bMaster = b.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const bWorker = b.spec.pytorchReplicaSpecs.Worker?.replicas || 0;

      // Sort by total replicas (Master + Worker)
      const aTotal = aMaster + aWorker;
      const bTotal = bMaster + bWorker;

      if (aTotal !== bTotal) {
        return aTotal - bTotal;
      }

      // If total is the same, sort by Worker replicas as secondary sort
      return aWorker - bWorker;
    },
  },
  {
    field: 'queue',
    label: 'Queue',
    width: 10,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number => {
      const aQueue = a.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      const bQueue = b.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      return aQueue.localeCompare(bQueue);
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 15,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number => {
      const first = a.metadata.creationTimestamp;
      const second = b.metadata.creationTimestamp;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'duration',
    label: 'Duration',
    width: 15,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number => {
      const aStart = new Date(a.status?.startTime || 0).getTime();
      const bStart = new Date(b.status?.startTime || 0).getTime();
      return aStart - bStart;
    },
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a: PyTorchJobKind, b: PyTorchJobKind): number => {
      const aState = getJobStatus(a);
      const bState = getJobStatus(b);
      return aState.localeCompare(bState);
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum TrainingJobToolbarFilterOptions {
  name = 'Name',
  queue = 'Queue',
  status = 'Status',
}

export const TrainingJobFilterOptions = {
  [TrainingJobToolbarFilterOptions.name]: 'Name',
  [TrainingJobToolbarFilterOptions.queue]: 'Queue',
  [TrainingJobToolbarFilterOptions.status]: 'Status',
};

export type TrainingJobFilterDataType = Record<TrainingJobToolbarFilterOptions, string | undefined>;

export const initialTrainingJobFilterData: TrainingJobFilterDataType = {
  [TrainingJobToolbarFilterOptions.name]: '',
  [TrainingJobToolbarFilterOptions.queue]: '',
  [TrainingJobToolbarFilterOptions.status]: '',
};
