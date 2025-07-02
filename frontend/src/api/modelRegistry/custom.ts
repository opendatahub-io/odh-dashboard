import {
  CreateModelArtifactData,
  CreateModelVersionData,
  CreateRegisteredModelData,
  ModelArtifact,
  ModelArtifactList,
  ModelVersionList,
  ModelVersion,
  RegisteredModelList,
  RegisteredModel,
  RegistryExperiment,
  RegistryExperimentList,
  RegistryExperimentRun,
  RegistryExperimentRunList,
  RegistryArtifactList,
  ModelRegistryQueryParams,
} from '#~/concepts/modelRegistry/types';
import { MODEL_REGISTRY_API_VERSION } from '#~/concepts/modelRegistry/const';
import { bumpRegisteredModelTimestamp } from '#~/concepts/modelRegistry/utils/updateTimestamps';
import { proxyCREATE, proxyGET, proxyPATCH } from '#~/api/proxyUtils';
import { K8sAPIOptions } from '#~/k8sTypes';
import { handleModelRegistryFailures } from './errorUtils';

const queryParamBuilder = (url: string, params: ModelRegistryQueryParams = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.set(key, value.toString());
  });
  return `${url}?${queryParams.toString()}`;
};

export const getRegistryExperiment =
  (hostPath: string) =>
  (opts: K8sAPIOptions, experimentId: string): Promise<RegistryExperiment> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiments/${experimentId}`,
        {},
        opts,
      ),
    );

export const getListRegistryExperiments =
  (hostPath: string) =>
  (opts: K8sAPIOptions): Promise<RegistryExperimentList> =>
    handleModelRegistryFailures(
      proxyGET(hostPath, `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiments`, {}, opts),
    );

export const getRegistryExperimentRuns =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    experimentId: string,
    params?: ModelRegistryQueryParams,
  ): Promise<RegistryExperimentRunList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        queryParamBuilder(
          `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiments/${experimentId}/experiment_runs`,
          params,
        ),
        {},
        opts,
      ),
    );

export const getRegistryExperimentRun =
  (hostPath: string) =>
  (opts: K8sAPIOptions, experimentRunId: string): Promise<RegistryExperimentRun> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiment_runs/${experimentRunId}`,
        {},
        opts,
      ),
    );

export const getRegistryExperimentRunArtifacts =
  (hostPath: string) =>
  (opts: K8sAPIOptions, experimentRunId: string): Promise<RegistryArtifactList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiment_runs/${experimentRunId}/artifacts`,
        {},
        opts,
      ),
    );

export const getRegistryExperimentRunMetricHistory =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    experimentRunId: string,
    metricName?: string,
  ): Promise<RegistryArtifactList> => {
    const params = metricName ? { name: metricName } : {};
    return handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/experiment_runs/${experimentRunId}/metric_history`,
        params,
        opts,
      ),
    );
  };

export const createRegisteredModel =
  (hostpath: string) =>
  (opts: K8sAPIOptions, data: CreateRegisteredModelData): Promise<RegisteredModel> =>
    handleModelRegistryFailures(
      proxyCREATE(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models`,
        data,
        {},
        opts,
      ),
    );

export const createModelVersion =
  (hostpath: string) =>
  (opts: K8sAPIOptions, data: CreateModelVersionData): Promise<ModelVersion> =>
    handleModelRegistryFailures(
      proxyCREATE(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions`,
        data,
        {},
        opts,
      ),
    );
export const createModelVersionForRegisteredModel =
  (hostpath: string) =>
  async (
    opts: K8sAPIOptions,
    registeredModelId: string,
    data: CreateModelVersionData,
    registeredModel: RegisteredModel,
    isFirstVersion?: boolean,
  ): Promise<ModelVersion> => {
    const newVersion = await handleModelRegistryFailures<ModelVersion>(
      proxyCREATE(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/${registeredModelId}/versions`,
        data,
        {},
        opts,
      ),
    );

    if (!isFirstVersion) {
      await bumpRegisteredModelTimestamp(
        { patchRegisteredModel: patchRegisteredModel(hostpath) },
        registeredModel,
      );
    }
    return newVersion;
  };

export const createModelArtifact =
  (hostPath: string) =>
  (opts: K8sAPIOptions, data: CreateModelArtifactData): Promise<ModelArtifact> =>
    handleModelRegistryFailures(
      proxyCREATE(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_artifacts`,
        data,
        {},
        opts,
      ),
    );

export const createModelArtifactForModelVersion =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    modelVersionId: string,
    data: CreateModelArtifactData,
  ): Promise<ModelArtifact> =>
    handleModelRegistryFailures(
      proxyCREATE(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelVersionId}/artifacts`,
        data,
        {},
        opts,
      ),
    );

export const getRegisteredModel =
  (hostPath: string) =>
  (opts: K8sAPIOptions, registeredModelId: string): Promise<RegisteredModel> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/${registeredModelId}`,
        {},
        opts,
      ),
    );

export const getModelVersion =
  (hostpath: string) =>
  (opts: K8sAPIOptions, modelversionId: string): Promise<ModelVersion> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelversionId}`,
        {},
        opts,
      ),
    );

export const getModelArtifact =
  (hostPath: string) =>
  (opts: K8sAPIOptions, modelArtifactId: string): Promise<ModelArtifact> =>
    handleModelRegistryFailures(
      proxyGET(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_artifacts/${modelArtifactId}`,
        {},
        opts,
      ),
    );

// TODO: the pageSize value here is temporary until we implement filter/sort on serverside, https://issues.redhat.com/browse/RHOAIENG-12800
export const getListModelArtifacts =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<ModelArtifactList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_artifacts?pageSize=99999`,
        {},
        opts,
      ),
    );

// TODO: the pageSize value here is temporary until we implement filter/sort on serverside, https://issues.redhat.com/browse/RHOAIENG-12800
export const getListModelVersions =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<ModelVersionList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions?pageSize=99999`,
        {},
        opts,
      ),
    );

// TODO: the pageSize value here is temporary until we implement filter/sort on serverside, https://issues.redhat.com/browse/RHOAIENG-12800
export const getListRegisteredModels =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<RegisteredModelList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models?pageSize=99999`,
        {},
        opts,
      ),
    );

// TODO: the pageSize value here is temporary until we implement filter/sort on serverside, https://issues.redhat.com/browse/RHOAIENG-12800
export const getModelVersionsByRegisteredModel =
  (hostpath: string) =>
  (opts: K8sAPIOptions, registeredmodelId: string): Promise<ModelVersionList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/${registeredmodelId}/versions?pageSize=99999`,
        {},
        opts,
      ),
    );

// TODO: the pageSize value here is temporary until we implement filter/sort on serverside, https://issues.redhat.com/browse/RHOAIENG-12800
export const getModelArtifactsByModelVersion =
  (hostpath: string) =>
  (opts: K8sAPIOptions, modelVersionId: string): Promise<ModelArtifactList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelVersionId}/artifacts?pageSize=99999`,
        {},
        opts,
      ),
    );

export const patchRegisteredModel =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    data: Partial<RegisteredModel>,
    registeredModelId: string,
  ): Promise<RegisteredModel> =>
    handleModelRegistryFailures<RegisteredModel>(
      proxyPATCH(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/${registeredModelId}`,
        data,
        opts,
      ),
    );

export const patchModelVersion =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    data: Partial<ModelVersion>,
    modelVersionId: string,
  ): Promise<ModelVersion> =>
    handleModelRegistryFailures<ModelVersion>(
      proxyPATCH(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelVersionId}`,
        data,
        opts,
      ),
    );

export const patchModelArtifact =
  (hostPath: string) =>
  (
    opts: K8sAPIOptions,
    data: Partial<ModelArtifact>,
    modelartifactId: string,
  ): Promise<ModelArtifact> =>
    handleModelRegistryFailures(
      proxyPATCH(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_artifacts/${modelartifactId}`,
        data,
        opts,
      ),
    );
