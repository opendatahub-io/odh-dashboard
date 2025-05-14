import React from 'react';
import { RunArtifact } from '~/concepts/pipelines/apiHooks/mlmd/types';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';
import { MarkdownAndTitle } from '~/concepts/pipelines/content/compareRuns/metricsSection/markdown/MarkdownCompare';
import {
  getFullArtifactPathLabel,
  getFullArtifactPaths,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { ArtifactType, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { allSettledPromises } from '~/utilities/allSettledPromises';

const useFetchMarkdownMaps = (
  markdownArtifacts?: RunArtifact[],
): {
  configMap: Record<string, MarkdownAndTitle[]>;
  runMap: Record<string, PipelineRunKF>;
  configsLoaded: boolean;
} => {
  const [configsLoaded, setConfigsLoaded] = React.useState(false);
  const { getStorageObjectRenderUrl } = useArtifactStorage();

  const [configMapBuilder, setConfigMapBuilder] = React.useState<
    Record<string, MarkdownAndTitle[]>
  >({});
  const [runMapBuilder, setRunMapBuilder] = React.useState<Record<string, PipelineRunKF>>({});

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
          let sizeBytes: number | undefined;
          let url: string | undefined;
          if (
            path.linkedArtifact.artifact.getType() === ArtifactType.MARKDOWN ||
            path.linkedArtifact.artifact.getType() === ArtifactType.HTML
          ) {
            url = await getStorageObjectRenderUrl(path.linkedArtifact.artifact).catch(
              () => undefined,
            );
          }

          if (url === undefined) {
            return null;
          }
          return { run, sizeBytes, url, path };
        }),

    [fullArtifactPaths, getStorageObjectRenderUrl],
  );

  React.useEffect(() => {
    setConfigsLoaded(false);
    setConfigMapBuilder({});
    setRunMapBuilder({});

    allSettledPromises(fetchStorageObjectPromises).then(([successes]) => {
      successes.forEach((result) => {
        if (result.value) {
          const { url, sizeBytes, run, path } = result.value;
          setRunMapBuilder((runMap) => ({ ...runMap, [run.run_id]: run }));

          const config = {
            title: getFullArtifactPathLabel(path),
            config: url,
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
