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
} from '~/concepts/modelRegistry/types';
import { proxyCREATE, proxyGET, proxyPATCH } from '~/api/proxyUtils';
import { K8sAPIOptions } from '~/k8sTypes';
import { MODEL_REGISTRY_API_VERSION } from '~/concepts/modelRegistry/const';
import { handleModelRegistryFailures } from './errorUtils';

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

export const getListModelArtifacts =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<ModelArtifactList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_artifacts`,
        {},
        opts,
      ),
    );

export const getListModelVersions =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<ModelVersionList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions`,
        {},
        opts,
      ),
    );

export const getListRegisteredModels =
  (hostpath: string) =>
  (opts: K8sAPIOptions): Promise<RegisteredModelList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models`,
        {},
        opts,
      ),
    );

export const getModelVersionsByRegisteredModel =
  (hostpath: string) =>
  (opts: K8sAPIOptions, registeredmodelId: string): Promise<ModelVersionList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/${registeredmodelId}/versions`,
        {},
        opts,
      ),
    );

export const getModelArtifactsByModelVersion =
  (hostpath: string) =>
  (opts: K8sAPIOptions, modelVersionId: string): Promise<ModelArtifactList> =>
    handleModelRegistryFailures(
      proxyGET(
        hostpath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelVersionId}/artifacts`,
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
    handleModelRegistryFailures(
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
    modelversionId: string,
  ): Promise<ModelVersion> =>
    handleModelRegistryFailures(
      proxyPATCH(
        hostPath,
        `/api/model_registry/${MODEL_REGISTRY_API_VERSION}/model_versions/${modelversionId}`,
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
