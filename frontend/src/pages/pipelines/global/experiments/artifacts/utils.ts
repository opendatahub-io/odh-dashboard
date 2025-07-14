/** URI related utils source: https://github.com/kubeflow/pipelines/blob/master/frontend/src/lib/Utils.tsx */
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { Artifact } from '#~/third_party/mlmd';

export const getArtifactName = (artifact: Artifact | undefined): string => {
  const artifactObject = artifact?.toObject();
  return (
    artifactObject?.name ||
    artifactObject?.customPropertiesMap.find(([name]) => name === 'display_name')?.[1]
      .stringValue ||
    '(No name)'
  );
};

export const getIsArtifactModelRegistered = (artifact?: Artifact): boolean => {
  const artifactModelData = getArtifactModelData(artifact);
  return Boolean(artifactModelData.registeredModelName);
};
