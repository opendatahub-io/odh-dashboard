import React from 'react';
import { RunArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { useArtifactStorage } from '#~/concepts/pipelines/apiHooks/useArtifactStorage';
import { MarkdownAndTitle } from '#~/concepts/pipelines/content/compareRuns/metricsSection/markdown/MarkdownCompare';
import {
  getFullArtifactPathLabel,
  getFullArtifactPaths,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { ArtifactType, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { readBoundedText } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { allSettledPromises } from '#~/utilities/allSettledPromises';

const useFetchMarkdownMaps = (
  markdownArtifacts?: RunArtifact[],
): {
  configMap: Record<string, MarkdownAndTitle[]>;
  runMap: Record<string, PipelineRunKF>;
  configsLoaded: boolean;
} => {
  const [configsLoaded, setConfigsLoaded] = React.useState(false);
  const { getStorageObjectRenderUrl, getStorageObjectDownloadUrl } = useArtifactStorage();

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
          let markdownContent: string | undefined;
          const artifactType = path.linkedArtifact.artifact.getType();

          if (artifactType === ArtifactType.MARKDOWN) {
            try {
              const downloadUrl = await getStorageObjectDownloadUrl(path.linkedArtifact.artifact);
              if (downloadUrl) {
                const response = await fetch(downloadUrl);
                if (response.ok) {
                  markdownContent = await readBoundedText(response);
                }
              }
            } catch {
              // Fall back to render URL for iframe display
            }
            if (!markdownContent) {
              url = await getStorageObjectRenderUrl(path.linkedArtifact.artifact).catch(
                () => undefined,
              );
            }
          } else if (artifactType === ArtifactType.HTML) {
            url = await getStorageObjectRenderUrl(path.linkedArtifact.artifact).catch(
              () => undefined,
            );
          }

          if (url === undefined && markdownContent === undefined) {
            return null;
          }
          return { run, sizeBytes, url, markdownContent, path };
        }),

    [fullArtifactPaths, getStorageObjectRenderUrl, getStorageObjectDownloadUrl],
  );

  React.useEffect(() => {
    setConfigsLoaded(false);
    setConfigMapBuilder({});
    setRunMapBuilder({});

    allSettledPromises(fetchStorageObjectPromises).then(([successes]) => {
      successes.forEach((result) => {
        if (result.value) {
          const { url, markdownContent: mdContent, sizeBytes, run, path } = result.value;
          setRunMapBuilder((runMap) => ({ ...runMap, [run.run_id]: run }));

          const config: MarkdownAndTitle = {
            title: getFullArtifactPathLabel(path),
            config: url ?? '',
            fileSize: sizeBytes,
            markdownContent: mdContent,
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
