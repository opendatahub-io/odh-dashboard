import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { useGetArtifactTypeMap } from '~/concepts/pipelines/apiHooks/mlmd/useGetArtifactTypes';
import { useGetEventsByExecutionId } from '~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import { useGetExecutionById } from '~/concepts/pipelines/apiHooks/mlmd/useGetExecutionById';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { inputOutputSectionTitle } from '~/pages/pipelines/global/experiments/executions/const';
import ExecutionDetailsCustomPropertiesSection from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsCustomPropertiesSection';
import ExecutionDetailsIDSection from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsIDSection';
import ExecutionDetailsInputOutputSection from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsInputOutputSection';
import ExecutionDetailsPropertiesSection from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesSection';
import ExecutionDetailsReferenceSection from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsReferenceSection';
import ExecutionStatus from '~/pages/pipelines/global/experiments/executions/ExecutionStatus';
import {
  getExecutionDisplayName,
  parseEventsByType,
} from '~/pages/pipelines/global/experiments/executions/utils';
import { executionsBaseRoute } from '~/routes';
import { Event } from '~/third_party/mlmd';

const ExecutionDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [execution, executionLoaded, executionError] = useGetExecutionById(executionId);
  const [eventsResponse, eventsLoaded, eventsError] = useGetEventsByExecutionId(executionId);
  const [artifactTypeMap, artifactTypeMapLoaded] = useGetArtifactTypeMap();
  const allEvents = parseEventsByType(eventsResponse);

  const error = executionError || eventsError;

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading execution details"
            icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
            headingLevel="h2"
          />
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!executionLoaded || !eventsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!execution) {
    navigate(contextPath ?? executionsBaseRoute(namespace));
    return;
  }

  const displayName = getExecutionDisplayName(execution);

  return (
    <ApplicationsPage
      title={
        <>
          <Split hasGutter>
            <SplitItem>{displayName}</SplitItem>
            <SplitItem>
              <ExecutionStatus status={execution.getLastKnownState()} />
            </SplitItem>
          </Split>
        </>
      }
      loaded
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <ExecutionDetailsIDSection execution={execution} />
        </StackItem>
        <StackItem>
          <ExecutionDetailsReferenceSection execution={execution} />
        </StackItem>
        <StackItem>
          <ExecutionDetailsPropertiesSection execution={execution} />
        </StackItem>
        <StackItem>
          <ExecutionDetailsCustomPropertiesSection execution={execution} />
        </StackItem>
        <StackItem>
          <ExecutionDetailsInputOutputSection
            title={inputOutputSectionTitle[Event.Type.DECLARED_INPUT]}
            events={allEvents[Event.Type.DECLARED_INPUT]}
            isLoaded={artifactTypeMapLoaded}
            artifactTypeMap={artifactTypeMap}
          />
        </StackItem>
        <StackItem>
          <ExecutionDetailsInputOutputSection
            title={inputOutputSectionTitle[Event.Type.INPUT]}
            events={allEvents[Event.Type.INPUT]}
            isLoaded={artifactTypeMapLoaded}
            artifactTypeMap={artifactTypeMap}
          />
        </StackItem>
        <StackItem>
          <ExecutionDetailsInputOutputSection
            title={inputOutputSectionTitle[Event.Type.DECLARED_OUTPUT]}
            events={allEvents[Event.Type.DECLARED_OUTPUT]}
            isLoaded={artifactTypeMapLoaded}
            artifactTypeMap={artifactTypeMap}
          />
        </StackItem>
        <StackItem>
          <ExecutionDetailsInputOutputSection
            title={inputOutputSectionTitle[Event.Type.OUTPUT]}
            events={allEvents[Event.Type.OUTPUT]}
            isLoaded={artifactTypeMapLoaded}
            artifactTypeMap={artifactTypeMap}
          />
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default ExecutionDetails;
