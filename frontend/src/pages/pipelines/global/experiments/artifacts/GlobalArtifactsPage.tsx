import React from 'react';

import { usePipelinesAPI, MlmdListContextProvider } from '#~/concepts/pipelines/context';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { artifactsBaseRoute } from '#~/routes/pipelines/artifacts';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { ArtifactsList } from './ArtifactsList';

export const GlobalArtifactsPage: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={<TitleWithIcon title="Artifacts" objectType={ProjectObjectType.pipelineArtifact} />}
      description="View your artifacts and their metadata."
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={artifactsBaseRoute}
      overrideTimeout
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <MlmdListContextProvider>
            <ArtifactsList />
          </MlmdListContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};
