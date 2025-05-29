import * as React from 'react';
import { ButtonVariant, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '#~/pages/projects/screens/detail/const';
import { PipelineServerTimedOut, usePipelinesAPI } from '#~/concepts/pipelines/context';
import ImportPipelineSplitButton from '#~/concepts/pipelines/content/import/ImportPipelineSplitButton';
import PipelinesList from '#~/pages/projects/screens/detail/pipelines/PipelinesList';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType } from '#~/concepts/design/utils';
import NoPipelineServer from '#~/concepts/pipelines/NoPipelineServer';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';

const PipelinesSection: React.FC = () => {
  const {
    apiAvailable,
    pipelinesServer: { initializing, installed, timedOut, compatible },
  } = usePipelinesAPI();
  const [isPipelinesEmpty, setIsPipelinesEmpty] = React.useState(false);

  const hideImportButton = installed && !compatible;

  const actions: React.ComponentProps<typeof DetailsSection>['actions'] = [];
  if (!hideImportButton) {
    actions.push(
      <ImportPipelineSplitButton
        disable={!installed}
        disableUploadVersion={installed && isPipelinesEmpty}
        key={`action-${ProjectSectionID.PIPELINES}`}
        variant="secondary"
      />,
    );
  }
  actions.push(
    <PipelineServerActions
      key={`action-${ProjectSectionID.PIPELINES}-1`}
      isDisabled={!initializing && !installed}
      variant="kebab"
    />,
  );

  return (
    <PipelineAndVersionContextProvider>
      <DetailsSection
        id={ProjectSectionID.PIPELINES}
        objectType={ProjectObjectType.pipeline}
        title={ProjectSectionTitles[ProjectSectionID.PIPELINES]}
        data-testid={ProjectSectionID.PIPELINES}
        popover={
          installed ? (
            <Popover
              headerContent="About pipelines"
              bodyContent="Pipelines are platforms for building and deploying portable and scalable machine-learning (ML) workflows. You can import a pipeline or create one in a workbench."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : null
        }
        actions={actions}
        isLoading={(!timedOut && compatible && !apiAvailable && installed) || initializing}
        isEmpty={!installed}
        emptyState={<NoPipelineServer variant={ButtonVariant.primary} />}
        showDivider={isPipelinesEmpty}
      >
        <EnsureCompatiblePipelineServer>
          {timedOut ? (
            <PipelineServerTimedOut />
          ) : installed ? (
            <PipelinesList setIsPipelinesEmpty={setIsPipelinesEmpty} />
          ) : null}
        </EnsureCompatiblePipelineServer>
      </DetailsSection>
    </PipelineAndVersionContextProvider>
  );
};

export default PipelinesSection;
