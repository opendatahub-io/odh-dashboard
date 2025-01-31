import * as React from 'react';
import { ButtonVariant, PageSection } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { MlmdListContextProvider, usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectObjectType } from '~/concepts/design/utils';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { ArtifactsList } from '~/pages/pipelines/global/experiments/artifacts/ArtifactsList';

const ArtifactsSection: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();
  const {
    apiAvailable,
    pipelinesServer: { initializing, installed, timedOut, compatible },
  } = pipelinesAPI;

  return (
    <PipelineAndVersionContextProvider>
      <DetailsSection
        id={ProjectSectionID.ARTIFACTS}
        objectType={ProjectObjectType.pipelineArtifact}
        title={ProjectSectionTitles[ProjectSectionID.ARTIFACTS]}
        description="View your artifacts and their metadata."
        data-testid={ProjectSectionID.ARTIFACTS}
        actions={[
          <PipelineServerActions
            key="server-actions"
            isDisabled={!pipelinesAPI.pipelinesServer.installed}
          />,
        ]}
        isLoading={(!timedOut && compatible && !apiAvailable && installed) || initializing}
        isEmpty={!installed}
        emptyState={<NoPipelineServer variant={ButtonVariant.primary} />}
      >
        <EnsureAPIAvailability>
          <EnsureCompatiblePipelineServer>
            <MlmdListContextProvider>
              <PageSection hasBodyWrapper={false} isFilled>
                <ArtifactsList />
              </PageSection>
            </MlmdListContextProvider>
          </EnsureCompatiblePipelineServer>
        </EnsureAPIAvailability>
      </DetailsSection>
    </PipelineAndVersionContextProvider>
  );
};

export default ArtifactsSection;
