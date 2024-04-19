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
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import { useSafePipelines } from '~/concepts/pipelines/apiHooks/usePipelines';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
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
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
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
