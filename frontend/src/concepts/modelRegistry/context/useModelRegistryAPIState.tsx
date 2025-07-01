import React from 'react';
import { APIState } from '#~/concepts/proxy/types';
import { ModelRegistryAPIs } from '#~/concepts/modelRegistry/types';
import {
  createModelArtifact,
  createModelArtifactForModelVersion,
  createModelVersion,
  createModelVersionForRegisteredModel,
  createRegisteredModel,
  getListModelArtifacts,
  getListModelVersions,
  getListRegisteredModels,
  getListRegistryExperiments,
  getModelArtifact,
  getModelArtifactsByModelVersion,
  getModelVersion,
  getModelVersionsByRegisteredModel,
  getRegisteredModel,
  getRegistryExperiment,
  getRegistryExperimentRun,
  getRegistryExperimentRunArtifacts,
  getRegistryExperimentRunMetricHistory,
  getRegistryExperimentRuns,
  patchModelArtifact,
  patchModelVersion,
  patchRegisteredModel,
} from '#~/api';
import useAPIState from '#~/concepts/proxy/useAPIState';

export type ModelRegistryAPIState = APIState<ModelRegistryAPIs>;

const useModelRegistryAPIState = (
  hostPath: string | null,
): [apiState: ModelRegistryAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      createRegisteredModel: createRegisteredModel(path),
      createModelVersion: createModelVersion(path),
      createModelVersionForRegisteredModel: createModelVersionForRegisteredModel(path),
      createModelArtifact: createModelArtifact(path),
      createModelArtifactForModelVersion: createModelArtifactForModelVersion(path),
      getRegisteredModel: getRegisteredModel(path),
      getModelVersion: getModelVersion(path),
      getModelArtifact: getModelArtifact(path),
      listModelArtifacts: getListModelArtifacts(path),
      listModelVersions: getListModelVersions(path),
      listRegisteredModels: getListRegisteredModels(path),
      getModelVersionsByRegisteredModel: getModelVersionsByRegisteredModel(path),
      getModelArtifactsByModelVersion: getModelArtifactsByModelVersion(path),
      patchRegisteredModel: patchRegisteredModel(path),
      patchModelVersion: patchModelVersion(path),
      patchModelArtifact: patchModelArtifact(path),
      getExperiment: getRegistryExperiment(path),
      listExperiments: getListRegistryExperiments(path),
      getExperimentRuns: getRegistryExperimentRuns(path),
      getExperimentRun: getRegistryExperimentRun(path),
      getExperimentRunArtifacts: getRegistryExperimentRunArtifacts(path),
      getExperimentRunMetricHistory: getRegistryExperimentRunMetricHistory(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default useModelRegistryAPIState;
