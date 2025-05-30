import {
  BreadcrumbItem,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { useGetArtifactTypes } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactTypes';
import { useGetEventsByExecutionId } from '#~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import { useGetExecutionById } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionById';
import { PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { inputOutputSectionTitle } from '#~/pages/pipelines/global/experiments/executions/const';
import ExecutionDetailsCustomPropertiesSection from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsCustomPropertiesSection';
import ExecutionDetailsIDSection from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsIDSection';
import ExecutionDetailsInputOutputSection from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsInputOutputSection';
import ExecutionDetailsPropertiesSection from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesSection';
import ExecutionDetailsReferenceSection from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsReferenceSection';
import { ExecutionStatus } from '#~/pages/pipelines/global/experiments/executions/ExecutionStatus';
import PipelineContextBreadcrumb from '#~/concepts/pipelines/content/PipelineContextBreadcrumb';
import {
  getExecutionDisplayName,
  parseEventsByType,
} from '#~/pages/pipelines/global/experiments/executions/utils';
import { Event } from '#~/third_party/mlmd';

const ExecutionDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const [execution, executionLoaded, executionError] = useGetExecutionById(executionId);
  const [events, eventsLoaded, eventsError] = useGetEventsByExecutionId(Number(executionId));
  const [artifactTypes, artifactTypesLoaded] = useGetArtifactTypes();
  const allEvents = parseEventsByType(events);

  const artifactTypeMap = artifactTypes.reduce<Record<number, string>>((acc, artifactType) => {
    acc[artifactType.getId()] = artifactType.getName();
    return acc;
  }, {});

  const error = executionError || eventsError;

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading execution details"
        >
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
    navigate(contextPath);
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
        <PipelineContextBreadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </PipelineContextBreadcrumb>
      }
      empty={false}
      provideChildrenPadding
    >
      <Flex
        spaceItems={{ default: 'spaceItems2xl' }}
        direction={{ default: 'column' }}
        // className="pf-v6-u-pt-lg pf-v6-u-pb-lg"
      >
        <FlexItem>
          <Stack hasGutter>
            <StackItem>
              <ExecutionDetailsIDSection execution={execution} />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsReferenceSection execution={execution} />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsPropertiesSection execution={execution} />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsCustomPropertiesSection execution={execution} />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsInputOutputSection
                title={inputOutputSectionTitle[Event.Type.DECLARED_INPUT]}
                events={allEvents[Event.Type.DECLARED_INPUT]}
                isLoaded={artifactTypesLoaded}
                artifactTypeMap={artifactTypeMap}
              />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsInputOutputSection
                title={inputOutputSectionTitle[Event.Type.INPUT]}
                events={allEvents[Event.Type.INPUT]}
                isLoaded={artifactTypesLoaded}
                artifactTypeMap={artifactTypeMap}
              />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsInputOutputSection
                title={inputOutputSectionTitle[Event.Type.DECLARED_OUTPUT]}
                events={allEvents[Event.Type.DECLARED_OUTPUT]}
                isLoaded={artifactTypesLoaded}
                artifactTypeMap={artifactTypeMap}
              />
            </StackItem>
          </Stack>
        </FlexItem>
        <FlexItem>
          <Stack>
            <StackItem>
              <ExecutionDetailsInputOutputSection
                title={inputOutputSectionTitle[Event.Type.OUTPUT]}
                events={allEvents[Event.Type.OUTPUT]}
                isLoaded={artifactTypesLoaded}
                artifactTypeMap={artifactTypeMap}
              />
            </StackItem>
          </Stack>
        </FlexItem>
      </Flex>
    </ApplicationsPage>
  );
};

export default ExecutionDetails;
