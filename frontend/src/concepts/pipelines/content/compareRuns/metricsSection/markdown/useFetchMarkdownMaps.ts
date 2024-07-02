import React from 'react';
import { RunArtifact } from '~/concepts/pipelines/apiHooks/mlmd/types';
import { extractS3UriComponents } from '~/concepts/pipelines/content/artifacts/utils';
import { MarkdownAndTitle } from '~/concepts/pipelines/content/compareRuns/metricsSection/markdown/MarkdownCompare';
import {
  getFullArtifactPathLabel,
  getFullArtifactPaths,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { fetchStorageObject, fetchStorageObjectSize } from '~/services/storageService';
import { allSettledPromises } from '~/utilities/allSettledPromises';

const useFetchMarkdownMaps = (
  markdownArtifacts?: RunArtifact[],
): {
  configMap: Record<string, MarkdownAndTitle[]>;
  runMap: Record<string, PipelineRunKFv2>;
  configsLoaded: boolean;
} => {
  const { namespace } = usePipelinesAPI();
  const [configsLoaded, setConfigsLoaded] = React.useState(false);
  const [configMapBuilder, setConfigMapBuilder] = React.useState<
    Record<string, MarkdownAndTitle[]>
  >({});
  const [runMapBuilder, setRunMapBuilder] = React.useState<Record<string, PipelineRunKFv2>>({});

  const fullArtifactPaths = React.useMemo(() => {
    if (!markdownArtifacts) {
      return [];
    }

    return getFullArtifactPaths(markdownArtifacts);
  }, [markdownArtifacts]);

  const fetchStorageObjectPromises = React.useMemo(
    () =>
      fullArtifactPaths
        .filter((path) => !!path.linkedArtifact.artifact.getUri())
        .map(async (path) => {
          const { run } = path;
          const uriComponents = extractS3UriComponents(path.linkedArtifact.artifact.getUri());
          if (!uriComponents) {
            return null;
          }
          const sizeBytes = await fetchStorageObjectSize(namespace, uriComponents.path).catch(
            () => undefined,
          );
          const text = await fetchStorageObject(namespace, uriComponents.path).catch(() => null);

          if (text === null) {
            return null;
          }

          return { run, sizeBytes, text, path };
        }),
    [fullArtifactPaths, namespace],
  );

  React.useEffect(() => {
    setConfigsLoaded(false);
    setConfigMapBuilder({});
    setRunMapBuilder({});

    allSettledPromises(fetchStorageObjectPromises).then(([successes]) => {
      successes.forEach((result) => {
        if (result.value) {
          const { text, sizeBytes, run, path } = result.value;
          setRunMapBuilder((runMap) => ({ ...runMap, [run.run_id]: run }));

          const config = {
            title: getFullArtifactPathLabel(path),
            config: text,
            fileSize: sizeBytes,
          };

          setConfigMapBuilder((configMap) => ({
            ...configMap,
            [run.run_id]: run.run_id in configMap ? [...configMap[run.run_id], config] : [config],
          }));
        }
      });
      setConfigsLoaded(true);
    });
  }, [fetchStorageObjectPromises]);

  return { configMap: configMapBuilder, runMap: runMapBuilder, configsLoaded };
};

export default useFetchMarkdownMaps;
