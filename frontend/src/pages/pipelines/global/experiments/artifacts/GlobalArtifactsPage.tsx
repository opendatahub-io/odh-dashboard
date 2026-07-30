import React from 'react';

import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { usePipelinesAPI, MlmdListContextProvider } from '#~/concepts/pipelines/context';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { artifactsBaseRoute } from '#~/routes/pipelines/artifacts';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { ArtifactsList } from './ArtifactsList';
import { artifactsPageDescription, artifactsPageTitle } from './constants';

export const GlobalArtifactsPage: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon title={artifactsPageTitle} objectType={ProjectObjectType.pipelineArtifact} />
      }
      description={artifactsPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={artifactsBaseRoute}
      overrideTimeout
      accessDomain="artifacts"
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
