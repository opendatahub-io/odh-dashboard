import * as React from 'react';
import { ButtonVariant, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import {
  CreatePipelineServerButton,
  PipelineServerTimedOut,
  usePipelinesAPI,
} from '~/concepts/pipelines/context';
import ImportPipelineSplitButton from '~/concepts/pipelines/content/import/ImportPipelineSplitButton';
import PipelinesList from '~/pages/projects/screens/detail/pipelines/PipelinesList';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';
import { useAccessReview } from '~/api';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import { ProjectObjectType } from '~/pages/projects/types';
import { typedEmptyImage } from '~/pages/projects/utils';

const PipelinesSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const {
    apiAvailable,
    pipelinesServer: { initializing, installed, timedOut },
  } = usePipelinesAPI();
  const [{ totalSize }, loaded, loadError] = usePipelines({ pageSize: 1 });

  const [isPipelinesEmpty, setIsPipelinesEmpty] = React.useState(false);
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.PIPELINES}
        objectType={ProjectObjectType.pipeline}
        title={ProjectSectionTitles[ProjectSectionID.PIPELINES]}
        popover={
          installed ? (
            <Popover
              headerContent="About pipelines"
              bodyContent="Standardize and automate machine learning workflows to enable you to further enhance and deploy your data science models."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : null
        }
        actions={[
          <ImportPipelineSplitButton
            disable={!installed}
            disableUploadVersion={installed && isPipelinesEmpty}
            key={`action-${ProjectSectionID.PIPELINES}`}
            variant="primary"
          />,
          <PipelineServerActions
            key={`action-${ProjectSectionID.PIPELINES}-1`}
            isDisabled={!initializing && !installed}
            variant="kebab"
          />,
        ]}
        isLoading={(!apiAvailable && installed) || initializing || (installed && !loaded)}
        isEmpty={!installed || totalSize === 0}
        loadError={loadError}
        emptyState={
          <EmptyDetailsView
            title="Start by creating a pipeline"
            description="Standardize and automate machine learning workflows to enable you to further enhance and deploy your data science models."
            iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
            imageAlt="create a pipeline"
            allowCreate={rbacLoaded && allowCreate}
            createButton={<CreatePipelineServerButton variant={ButtonVariant.primary} />}
          />
        }
        showDivider={isPipelinesEmpty}
      >
        {timedOut ? (
          <PipelineServerTimedOut />
        ) : (
          <>{installed ? <PipelinesList setIsPipelinesEmpty={setIsPipelinesEmpty} /> : null}</>
        )}
      </DetailsSection>
    </>
  );
};

export default PipelinesSection;
