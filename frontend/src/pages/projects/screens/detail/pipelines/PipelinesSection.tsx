import * as React from 'react';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import ImportPipelineButton from '~/concepts/pipelines/import/ImportPipelineButton';
import PipelinesList from '~/pages/projects/screens/detail/pipelines/PipelinesList';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';

const PipelinesSection: React.FC = () => {
  const {
    pipelinesServer: { initializing, installed },
  } = usePipelinesAPI();

  return (
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
      <EnsureAPIAvailability>
        <PipelinesList />
      </EnsureAPIAvailability>
    </DetailsSection>
  );
};

export default PipelinesSection;
