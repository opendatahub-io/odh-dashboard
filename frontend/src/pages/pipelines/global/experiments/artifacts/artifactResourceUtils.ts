import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { GrpcStatusCode } from '#~/api/pipelines/errorUtils';
import { ArtifactKF, PipelinesFilterOp } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';
import { FilterOptions } from './constants';

export const getArtifactResourceName = (artifact?: ArtifactKF): string =>
  artifact?.name || '(No name)';

export const getRegisteredModelData = (artifact?: ArtifactKF): PipelineRunArtifactModelData => {
  const metadata = artifact?.metadata;
  const readString = (key: string): string | undefined => {
    const value = metadata?.[key];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    registeredModelName: readString('registeredModelName'),
    modelRegistryName: readString('modelRegistryName'),
    modelVersionName: readString('modelVersionName'),
    modelVersionId: readString('modelVersionId'),
    registeredModelId: readString('registeredModelId'),
  };
};

export const getIsArtifactResourceModelRegistered = (artifact?: ArtifactKF): boolean => {
  const { registeredModelName, registeredModelId, modelVersionId, modelRegistryName } =
    getRegisteredModelData(artifact);
  return Boolean(registeredModelName && registeredModelId && modelVersionId && modelRegistryName);
};

export const isArtifactAccessDenied = (error: Error): boolean =>
  getGenericErrorCode(error) === 403 ||
  ('grpcCode' in error && error.grpcCode === GrpcStatusCode.PERMISSION_DENIED);

// ArtifactService accepts the KFP JSON filter protocol, not MLMD SQL expressions.
export const getArtifactsFilter = (
  filterData: Record<FilterOptions, string | undefined>,
): string | undefined => {
  const predicates = [];
  if (filterData[FilterOptions.Artifact]) {
    predicates.push({
      key: 'name',
      operation: PipelinesFilterOp.IS_SUBSTRING,
      // eslint-disable-next-line camelcase
      string_value: filterData[FilterOptions.Artifact],
    });
  }
  if (filterData[FilterOptions.Id]) {
    predicates.push({
      key: 'artifact_id',
      operation: PipelinesFilterOp.EQUALS,
      // eslint-disable-next-line camelcase
      string_value: filterData[FilterOptions.Id],
    });
  }
  if (filterData[FilterOptions.Type]) {
    predicates.push({
      key: 'type',
      operation: PipelinesFilterOp.EQUALS,
      // eslint-disable-next-line camelcase
      int_value: Number(filterData[FilterOptions.Type]),
    });
  }
  return predicates.length ? JSON.stringify({ predicates }) : undefined;
};
