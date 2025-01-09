import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.OVERVIEW]: 'Overview',
  [ProjectSectionID.WORKBENCHES]: 'Workbenches',
  [ProjectSectionID.EXPERIMENTS_AND_RUNS]: 'Experiments and runs',
  [ProjectSectionID.RUNS]: 'Runs',
  [ProjectSectionID.EXECUTIONS]: 'Executions',
  [ProjectSectionID.ARTIFACTS]: 'Artifacts',
  [ProjectSectionID.DISTRIBUTED_WORKLOADS]: 'Distributed workloads',
  [ProjectSectionID.MODEL_DEPLOYMENTS]: 'Model deployments',
  [ProjectSectionID.CLUSTER_STORAGES]: 'Cluster storage',
  [ProjectSectionID.DATA_CONNECTIONS]: 'Data connections',
  [ProjectSectionID.CONNECTIONS]: 'Connections',
  [ProjectSectionID.MODEL_SERVER]: 'Models and model servers',
  [ProjectSectionID.PIPELINES]: 'Pipelines',
  [ProjectSectionID.PERMISSIONS]: 'Permissions',
  [ProjectSectionID.SETTINGS]: 'Cluster settings',
  [ProjectSectionID.GENERAL_SETTINGS]: 'General settings',
  [ProjectSectionID.ENVIRONMENT_SETUP]: 'Environment setup',
  [ProjectSectionID.MODEL_SETUP]: 'Model resources and operations',
};
