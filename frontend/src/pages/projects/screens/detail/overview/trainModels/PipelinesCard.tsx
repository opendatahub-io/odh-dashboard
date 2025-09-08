import * as React from 'react';
import {
  Alert,
  ButtonVariant,
  CardBody,
  CardFooter,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Stack,
  Content,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { CreatePipelineServerButton, usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useSafePipelines } from '#~/concepts/pipelines/apiHooks/usePipelines';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import PipelinesOverviewCard from './PipelinesOverviewCard';
import PipelinesCardMetrics from './PipelinesCardMetrics';

const PipelinesCard: React.FC = () => {
  const { pipelinesServer } = usePipelinesAPI();
  const {
    notebooks: { data: notebooks, loaded: notebooksLoaded, error: notebooksError },
  } = React.useContext(ProjectDetailsContext);

  const [{ totalSize: pipelinesCount }] = useSafePipelines({
    pageSize: 1,
  });

  const renderContent = () => {
    if (pipelinesServer.initializing) {
      return (
        <EmptyState headingLevel="h3" icon={() => <Spinner size="lg" />} variant="xs">
          <EmptyStateBody>Loading...</EmptyStateBody>
        </EmptyState>
      );
    }
    if (!pipelinesServer.installed) {
      return (
        <>
          <CardBody>
            <Stack hasGutter>
              <Content>
                <Content component="small">
                  To create or use pipelines, you must first configure a pipeline server in this
                  project. A pipeline server provides the infrastructure necessary for the pipeline
                  to execute steps, track results, and manage runs.
                </Content>
              </Content>
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
            <CreatePipelineServerButton
              variant={ButtonVariant.link}
              isInline
              title="Configure pipeline server"
            />
          </CardFooter>
        </>
      );
    }

    return (
      <EnsureAPIAvailability inTab>
        <EnsureCompatiblePipelineServer emptyStateVariant={EmptyStateVariant.xs}>
          <PipelinesCardMetrics />
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    );
  };

  return (
    <PipelinesOverviewCard pipelinesCount={pipelinesCount}>{renderContent()}</PipelinesOverviewCard>
  );
};

export default PipelinesCard;
