import * as React from 'react';
import {
  Alert,
  ButtonVariant,
  CardBody,
  CardFooter,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
  Stack,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import usePipelineRunJobs from '~/concepts/pipelines/apiHooks/usePipelineRunJobs';
import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiments';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import PipelinesCardItems from '~/pages/projects/screens/detail/overview/trainModels/PipelinesCardItems';
import MetricsContents from './MetricsContents';

const PipelinesCard: React.FC = () => {
  const { pipelinesServer } = usePipelinesAPI();
  const {
    currentProject,
    notebooks: { data: notebooks, loaded: notebooksLoaded, error: notebooksError },
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const [{ items: pipelines, totalSize: pipelinesCount }, pipelinesLoaded, pipelinesError] =
    usePipelines({
      pageSize: 5,
    });
  const [{ totalSize: activeRunsCount }, activeRunsLoaded, activeRunsError] = usePipelineActiveRuns(
    {
      pageSize: 1,
    },
  );
  const [{ totalSize: archivedRunsCount }, archivedRunsLoaded, archivedRunsError] =
    usePipelineArchivedRuns({
      pageSize: 1,
    });
  const [{ totalSize: scheduledCount }, scheduledLoaded, scheduledError] = usePipelineRunJobs({
    pageSize: 1,
  });
  const [{ totalSize: experimentsCount }, experimentsLoaded, experimentsError] = useExperiments({
    pageSize: 1,
  });

  const loaded =
    !pipelinesServer.initializing &&
    pipelinesLoaded &&
    activeRunsLoaded &&
    archivedRunsLoaded &&
    scheduledLoaded &&
    experimentsLoaded;

  const loadError =
    pipelinesError || activeRunsError || archivedRunsError || scheduledError || experimentsError;

  const triggeredCount = activeRunsCount + archivedRunsCount;

  const statistics = React.useMemo(
    () => [
      {
        count: pipelinesCount,
        text: pipelinesCount === 1 ? 'Pipeline' : 'Pipelines',
      },
      {
        count: scheduledCount,
        text: scheduledCount === 1 ? 'Schedule' : 'Schedules',
      },
      {
        count: triggeredCount,
        text: triggeredCount === 1 ? 'Run' : 'Runs',
      },
      {
        count: experimentsCount,
        text: experimentsCount === 1 ? 'Experiment' : 'Experiments',
      },
    ],
    [experimentsCount, pipelinesCount, scheduledCount, triggeredCount],
  );

  const renderContent = () => {
    if (loadError) {
      return (
        <EmptyState variant="xs">
          <EmptyStateHeader
            icon={
              <EmptyStateIcon
                icon={() => (
                  <ExclamationCircleIcon
                    style={{
                      color: 'var(--pf-v5-global--danger-color--100)',
                      width: '32px',
                      height: '32px',
                    }}
                  />
                )}
              />
            }
            headingLevel="h3"
          />
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
        </EmptyState>
      );
    }

    if (!loaded) {
      return (
        <EmptyState variant="xs">
          <EmptyStateHeader
            icon={<EmptyStateIcon icon={() => <Spinner size="lg" />} />}
            headingLevel="h3"
          />
          <EmptyStateBody>Loading...</EmptyStateBody>
        </EmptyState>
      );
    }

    if (!pipelinesServer.installed) {
      return (
        <>
          <CardBody>
            <Stack hasGutter>
              <TextContent>
                <Text component="small">
                  Pipelines are platforms for building and deploying portable and scalable
                  machine-learning (ML) workflows. You can import a pipeline or create one in a
                  workbench. Before you can work with pipelines, you must first configure a pipeline
                  server in your project.
                </Text>
              </TextContent>
              {notebooksLoaded && !notebooksError && notebooks.length > 0 ? (
                <Alert
                  isInline
                  isPlain
                  variant="warning"
                  title="Restart running workbenches after configuring the pipeline server"
                >
                  If you&apos;ve already created pipelines in a workbench, restart the workbench
                  after configuring the pipeline server to view your pipelines here.
                </Alert>
              ) : null}
            </Stack>
          </CardBody>
          <CardFooter>
            {allowCreate ? (
              <CreatePipelineServerButton
                variant={ButtonVariant.link}
                isInline
                title="Configure pipeline server"
              />
            ) : null}
          </CardFooter>
        </>
      );
    }

    return (
      <EnsureCompatiblePipelineServer>
        {pipelinesCount ? (
          <>
            <MetricsContents
              title="Pipelines"
              allowCreate={allowCreate}
              createButton={<ImportPipelineButton variant="link" />}
              createText="Import pipeline"
              statistics={statistics}
              listItems={
                <PipelinesCardItems
                  pipelines={pipelines}
                  loaded={loaded}
                  error={loadError}
                  totalCount={pipelinesCount}
                  currentProject={currentProject}
                />
              }
            />
          </>
        ) : (
          <>
            <CardBody>
              <TextContent>
                <Text component="small">
                  Pipelines are platforms for building and deploying portable and scalable
                  machine-learning (ML) workflows. You can import a pipeline or create one in a
                  workbench.
                </Text>
              </TextContent>
            </CardBody>
            {allowCreate ? (
              <CardFooter>
                <ImportPipelineButton variant="link" isInline />
              </CardFooter>
            ) : null}
          </>
        )}
      </EnsureCompatiblePipelineServer>
    );
  };

  return (
    <OverviewCard
      id="Pipelines"
      objectType={ProjectObjectType.pipeline}
      sectionType={pipelinesCount ? SectionType.training : SectionType.organize}
      title="Pipelines"
      popoverHeaderContent={pipelinesCount ? 'About pipelines' : undefined}
      popoverBodyContent={
        !pipelinesCount
          ? 'Pipelines are platforms for building and deploying portable and scalable machine-learning (ML) workflows. You can import a pipeline or create one in a workbench.'
          : undefined
      }
      data-testid="section-pipelines"
    >
      {renderContent()}
    </OverviewCard>
  );
};

export default PipelinesCard;
