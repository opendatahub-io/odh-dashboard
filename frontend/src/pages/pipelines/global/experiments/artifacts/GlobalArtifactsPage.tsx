import React from 'react';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { artifactsBaseRoute } from '~/routes';
import { ArtifactsListTable } from './ArtifactsListTable';

export const GlobalArtifactsPage: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title="Artifacts"
      description="View your artifacts and their metadata."
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPI.pipelinesServer.installed} />}
      getRedirectPath={artifactsBaseRoute}
      overrideChildPadding
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <ArtifactsListTable />
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};
