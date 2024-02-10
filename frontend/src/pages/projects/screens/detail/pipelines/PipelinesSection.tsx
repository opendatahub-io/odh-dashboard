import * as React from 'react';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { PipelineServerTimedOut, usePipelinesAPI } from '~/concepts/pipelines/context';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelinesList from '~/pages/projects/screens/detail/pipelines/PipelinesList';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import ImportPipelineSplitButton from '~/concepts/pipelines/content/import/ImportPipelineSplitButton';

const PipelinesSection: React.FC = () => {
  const {
    apiAvailable,
    pipelinesServer: { initializing, installed, timedOut },
  } = usePipelinesAPI();

  const [isPipelinesEmpty, setIsPipelinesEmpty] = React.useState(false);

  return (
    <PipelineAndVersionContextProvider>
      <DetailsSection
        id={ProjectSectionID.PIPELINES}
        title={ProjectSectionTitles[ProjectSectionID.PIPELINES]}
        actions={[
          <ImportPipelineSplitButton
            disable={!installed}
            disableUploadVersion={installed && isPipelinesEmpty}
            key={`action-${ProjectSectionID.PIPELINES}`}
            variant="secondary"
          />,
          <PipelineServerActions
            key={`action-${ProjectSectionID.PIPELINES}-1`}
            isDisabled={!initializing && !installed}
            variant="kebab"
          />,
        ]}
        isLoading={(!apiAvailable && installed) || initializing}
        isEmpty={!installed}
        emptyState={<NoPipelineServer variant="secondary" />}
        showDivider={isPipelinesEmpty}
      >
        <EnsureCompatiblePipelineServer>
          {timedOut ? (
            <PipelineServerTimedOut />
          ) : (
            <PipelinesList setIsPipelinesEmpty={setIsPipelinesEmpty} />
          )}
        </EnsureCompatiblePipelineServer>
      </DetailsSection>
    </PipelineAndVersionContextProvider>
  );
};

export default PipelinesSection;
