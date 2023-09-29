import * as React from 'react';
import { Divider } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { PipelineServerTimedOut, usePipelinesAPI } from '~/concepts/pipelines/context';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelinesList from '~/pages/projects/screens/detail/pipelines/PipelinesList';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';

const PipelinesSection: React.FC = () => {
  const {
    pipelinesServer: { initializing, installed, timedOut },
  } = usePipelinesAPI();

  const [isPipelinesEmpty, setIsPipelinesEmpty] = React.useState(false);

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.PIPELINES}
        title={ProjectSectionTitles[ProjectSectionID.PIPELINES]}
        actions={[
          <ImportPipelineButton
            isDisabled={!installed}
            key={`action-${ProjectSectionID.PIPELINES}`}
            variant="secondary"
          />,
        ]}
        isLoading={initializing}
        isEmpty={!installed}
        emptyState={<NoPipelineServer variant="secondary" />}
      >
        {timedOut ? (
          <PipelineServerTimedOut />
        ) : (
          <EnsureAPIAvailability>
            <PipelinesList setIsPipelinesEmpty={setIsPipelinesEmpty} />
          </EnsureAPIAvailability>
        )}
      </DetailsSection>
      {(isPipelinesEmpty || !installed) && <Divider data-id="details-page-section-divider" />}
    </>
  );
};

export default PipelinesSection;
