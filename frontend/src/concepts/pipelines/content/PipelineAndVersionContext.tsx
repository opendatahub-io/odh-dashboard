import * as React from 'react';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';

type PipelineAndVersionContextType = {
  pipelineDataSelector: () => {
    selectedPipelines: PipelineKFv2[];
    setSelectedPipelines: React.Dispatch<React.SetStateAction<PipelineKFv2[]>>;
  };
  versionDataSelector: (pipeline: PipelineKFv2) => {
    selectedVersions: PipelineVersionKFv2[];
    setSelectedVersions: React.Dispatch<React.SetStateAction<PipelineVersionKFv2[]>>;
  };
  getResourcesForDeletion: () => {
    pipelines: PipelineKFv2[];
    versions: { pipelineName: string; version: PipelineVersionKFv2 }[];
  };
  clearAfterDeletion: () => void;
  isPipelineChecked: (pipelineId: string) => boolean;
};

type PipelineAndVersionContextProviderProps = {
  children: React.ReactNode;
};

type SelectedVersion = { pipelineName: string; versions: PipelineVersionKFv2[] };

export const PipelineAndVersionContext = React.createContext<PipelineAndVersionContextType>({
  pipelineDataSelector: () => ({ selectedPipelines: [], setSelectedPipelines: () => undefined }),
  versionDataSelector: () => ({ selectedVersions: [], setSelectedVersions: () => undefined }),
  getResourcesForDeletion: () => ({ pipelines: [], versions: [] }),
  clearAfterDeletion: () => undefined,
  isPipelineChecked: () => false,
});

const PipelineAndVersionContextProvider: React.FC<PipelineAndVersionContextProviderProps> = ({
  children,
}) => {
  const [selectedPipelines, setSelectedPipelines] = React.useState<PipelineKFv2[]>([]);
  const [selectedVersions, setSelectedVersions] = React.useState<{
    [pipelineId: string]: SelectedVersion | undefined;
  }>({});

  const setVersions =
    (pipeline: PipelineKFv2) =>
    (
      newVersions:
        | PipelineVersionKFv2[]
        | ((prevState: PipelineVersionKFv2[]) => PipelineVersionKFv2[]),
    ) => {
      setSelectedVersions((prev) => ({
        ...prev,
        [pipeline.pipeline_id]: {
          pipelineName: pipeline.display_name,
          versions:
            typeof newVersions === 'function'
              ? newVersions(prev[pipeline.pipeline_id]?.versions || [])
              : newVersions,
        },
      }));
    };

  const isPipelineChecked = React.useCallback(
    (pipelineId: string) =>
      selectedPipelines.some((pipeline) => pipeline.pipeline_id === pipelineId),
    [selectedPipelines],
  );

  const contextValue = React.useMemo(
    () => ({
      pipelineDataSelector: () => ({
        selectedPipelines,
        setSelectedPipelines,
      }),
      versionDataSelector: (pipeline: PipelineKFv2) => ({
        selectedVersions: selectedVersions[pipeline.pipeline_id]?.versions || [],
        setSelectedVersions: setVersions(pipeline),
      }),
      getResourcesForDeletion: () => ({
        pipelines: selectedPipelines,
        versions: Object.values(selectedVersions)
          .map(
            (selectedVersion) =>
              selectedVersion?.versions.map((version) => ({
                pipelineName: selectedVersion.pipelineName,
                version,
              })) ?? [],
          )
          .flat()
          .filter((selection) => {
            const selectedPipelinesId = selectedPipelines.map((pipeline) => pipeline.pipeline_id);
            const pipelineId = selection.version.pipeline_id;
            // if the pipeline of the pipeline version will be deleted too, there is no need to delete the pipeline version
            if (pipelineId && selectedPipelinesId.includes(pipelineId)) {
              return false;
            }
            return true;
          }),
      }),
      clearAfterDeletion: () => {
        setSelectedPipelines([]);
        setSelectedVersions({});
      },
      isPipelineChecked,
    }),
    [isPipelineChecked, selectedPipelines, selectedVersions],
  );

  return (
    <PipelineAndVersionContext.Provider value={contextValue}>
      {children}
    </PipelineAndVersionContext.Provider>
  );
};

export default PipelineAndVersionContextProvider;
