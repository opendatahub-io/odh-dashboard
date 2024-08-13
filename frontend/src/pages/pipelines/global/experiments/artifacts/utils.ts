/** URI related utils source: https://github.com/kubeflow/pipelines/blob/master/frontend/src/lib/Utils.tsx */
import { Artifact } from '~/third_party/mlmd';

export const getArtifactName = (artifact: Artifact | undefined): string => {
  const artifactObject = artifact?.toObject();
  return (
    artifactObject?.name ||
    artifactObject?.customPropertiesMap.find(([name]) => name === 'display_name')?.[1]
      .stringValue ||
    '(No name)'
  );
};
