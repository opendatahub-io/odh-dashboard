import * as React from 'react';
import { Alert, Divider } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { PipelineServerTimedOut, usePipelinesAPI } from '~/concepts/pipelines/context';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelinesList from '~/pages/projects/screens/detail/pipelines/PipelinesList';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';

const PipelinesSection: React.FC = () => {
  const {
    project,
    pipelinesServer: { initializing, installed, timedOut },
  } = usePipelinesAPI();

  const [isPipelinesEmpty, setIsPipelinesEmpty] = React.useState(false);

  if (!project) {
    // Only possible today because of not having the API installed
    // TODO: Fix in https://github.com/opendatahub-io/odh-dashboard/issues/2010
    return (
      <DetailsSection
        id={ProjectSectionID.PIPELINES}
        title={ProjectSectionTitles[ProjectSectionID.PIPELINES]}
        isLoading={false}
        isEmpty={false}
        emptyState={null}
      >
        <Alert isInline variant="danger" title="Pipelines not installed" />
      </DetailsSection>
    );
  }

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
          <PipelineServerActions
            key={`action-${ProjectSectionID.PIPELINES}-1`}
            isDisabled={!initializing && !installed}
            variant="kebab"
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
