/** URI related utils source: https://github.com/kubeflow/pipelines/blob/master/frontend/src/lib/Utils.tsx */
import { Artifact } from '~/third_party/mlmd';

export const getArtifactName = (artifact: Artifact.AsObject | undefined): string =>
  artifact?.name ||
  artifact?.customPropertiesMap.find(([name]) => name === 'display_name')?.[1].stringValue ||
  '(No name)';

export function buildQuery(queriesMap?: { [key: string]: string | number | undefined }): string {
  const queryContent = Object.entries(queriesMap || {})
    .filter((entry): entry is [string, string | number] => entry[1] != null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  if (!queryContent) {
    return '';
  }
  return `?${queryContent}`;
}
