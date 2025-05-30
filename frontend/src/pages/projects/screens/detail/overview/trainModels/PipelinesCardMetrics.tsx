import * as React from 'react';
import {
  CardBody,
  CardFooter,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Content,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '#~/concepts/pipelines/apiHooks/usePipelineRuns';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useExperiments from '#~/concepts/pipelines/apiHooks/useExperiments';
import usePipelines from '#~/concepts/pipelines/apiHooks/usePipelines';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import ImportPipelineButton from '#~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelinesCardItems from '#~/pages/projects/screens/detail/overview/trainModels/PipelinesCardItems';
import usePipelineRecurringRuns from '#~/concepts/pipelines/apiHooks/usePipelineRecurringRuns';
import MetricsContents from './MetricsContents';

const PipelinesCardMetrics: React.FC = () => {
  const { pipelinesServer } = usePipelinesAPI();
  const { currentProject } = React.useContext(ProjectDetailsContext);

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
  const [{ totalSize: scheduledCount }, scheduledLoaded, scheduledError] = usePipelineRecurringRuns(
    {
      pageSize: 1,
    },
  );
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

  if (loadError) {
    return (
      <EmptyState
        headingLevel="h3"
        icon={() => (
          <ExclamationCircleIcon
            style={{
              color: 'var(--pf-t--global--icon--color--status--danger--default)',
              width: '32px',
              height: '32px',
            }}
          />
        )}
        variant="xs"
      >
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <EmptyState headingLevel="h3" icon={() => <Spinner size="lg" />} variant="xs">
        <EmptyStateBody>Loading...</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <EnsureCompatiblePipelineServer>
      {pipelinesCount ? (
        <>
          <MetricsContents
            title="Pipelines"
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
            <Content>
              <Content component="small">
                Pipelines are platforms for building and deploying portable and scalable
                machine-learning (ML) workflows. You can import a pipeline or create one in a
                workbench.
              </Content>
            </Content>
          </CardBody>
          <CardFooter>
            <ImportPipelineButton variant="link" isInline />
          </CardFooter>
        </>
      )}
    </EnsureCompatiblePipelineServer>
  );
};

export default PipelinesCardMetrics;
