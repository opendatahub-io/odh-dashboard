import * as React from 'react';
import { Gallery } from '@patternfly/react-core';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { PipelineContextProvider } from '#~/concepts/pipelines/context/PipelinesContext';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import PipelinesCard from './PipelinesCard';
import NotebooksCard from './NotebooksCard';

const TrainModelsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  if (!workbenchEnabled && !pipelinesEnabled) {
    return null;
  }

  return (
    <CollapsibleSection title="Train models">
      <Gallery
        hasGutter
        minWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
        maxWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
      >
        {workbenchEnabled ? <NotebooksCard /> : null}
        {pipelinesEnabled ? (
          <PipelineContextProvider namespace={currentProject.metadata.name}>
            <PipelineAndVersionContextProvider>
              <PipelinesCard />
            </PipelineAndVersionContextProvider>
          </PipelineContextProvider>
        ) : null}
      </Gallery>
    </CollapsibleSection>
  );
};

export default TrainModelsSection;
