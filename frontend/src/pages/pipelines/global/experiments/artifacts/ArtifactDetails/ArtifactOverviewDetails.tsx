import React from 'react';

import {
  Flex,
  FlexItem,
  Stack,
  Title,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Content,
  StackItem,
  Skeleton,
} from '@patternfly/react-core';

import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Artifact } from '#~/third_party/mlmd';
import { ArtifactUriLink } from '#~/concepts/pipelines/content/artifacts/ArtifactUriLink';
import { useGetEventByArtifactId } from '#~/concepts/pipelines/apiHooks/mlmd/useGetEventByArtifactId';
import { executionDetailsRoute } from '#~/routes/pipelines/executions';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetExecutionById } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionById';
import { getOriginalExecutionId } from '#~/pages/pipelines/global/experiments/executions/utils';
import PipelineRunRegisteredModelDetails from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunRegisteredModelDetails';
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import ExperimentPipelineRunLink from '#~/pages/pipelines/global/experiments/ExperimentPipelineRunLink';
import { ArtifactPropertyDescriptionList } from './ArtifactPropertyDescriptionList';

interface ArtifactOverviewDetailsProps {
  artifact: Artifact | undefined;
}

export const ArtifactOverviewDetails: React.FC<ArtifactOverviewDetailsProps> = ({ artifact }) => {
  const artifactObject = artifact?.toObject();
  const [event] = useGetEventByArtifactId(artifact?.getId());
  const [execution, executionLoaded] = useGetExecutionById(event?.getExecutionId().toString());
  const { namespace } = usePipelinesAPI();
  const originalExecutionId = getOriginalExecutionId(execution);
  const actualExecutionId = originalExecutionId ? Number(originalExecutionId) : execution?.getId();
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);

  const artifactModelData = React.useMemo(() => {
    if (!modelRegistryAvailable || !artifact) {
      return {};
    }
    return getArtifactModelData(artifact);
  }, [artifact, modelRegistryAvailable]);

  return (
    <Flex
      spaceItems={{ default: 'spaceItems2xl' }}
      direction={{ default: 'column' }}
      className="pf-v6-u-pt-lg pf-v6-u-pb-lg"
    >
      <FlexItem>
        <Stack hasGutter>
          <Title headingLevel="h3">Live system dataset</Title>
          <DescriptionList isHorizontal data-testid="dataset-description-list">
            <DescriptionListGroup>
              {artifact && artifactObject && (
                <>
                  <DescriptionListTerm data-testid="dataset-description-list-URI">
                    URI
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    <ArtifactUriLink artifact={artifact} />
                  </DescriptionListDescription>
                </>
              )}
            </DescriptionListGroup>
          </DescriptionList>
        </Stack>
      </FlexItem>
      <FlexItem>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h3">Reference</Title>
          </StackItem>
          <StackItem>
            <Table
              aria-label="Artifact details reference table"
              data-testid="artifact-details-reference-table"
              variant="compact"
              borders={false}
            >
              <Thead>
                <Tr>
                  <Th width={30}>Name</Th>
                  <Th width={70}>Link</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td dataLabel="Name">Original run</Td>
                  <Td dataLabel="Link">
                    <ExperimentPipelineRunLink
                      executionId={actualExecutionId}
                      namespace={namespace}
                    />
                  </Td>
                </Tr>
                <Tr>
                  <Td dataLabel="Name">Original execution</Td>
                  <Td dataLabel="Link">
                    {executionLoaded && execution ? (
                      <Link to={executionDetailsRoute(namespace, actualExecutionId?.toString())}>
                        {`execution/${actualExecutionId ?? ''}`}
                      </Link>
                    ) : (
                      <Skeleton />
                    )}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </StackItem>
        </Stack>
      </FlexItem>
      <FlexItem data-testid="artifact-properties-section">
        <Stack hasGutter>
          <Title headingLevel="h3">Properties</Title>
          {artifactObject?.propertiesMap && artifactObject.propertiesMap.length !== 0 ? (
            <ArtifactPropertyDescriptionList
              propertiesMap={artifactObject.propertiesMap}
              testId="props-description-list"
            />
          ) : (
            <Content>
              <Content component="small">No properties</Content>
            </Content>
          )}
        </Stack>
      </FlexItem>
      <FlexItem data-testid="artifact-custom-properties-section">
        <Stack hasGutter>
          <Title headingLevel="h3">Custom properties</Title>
          {artifactObject?.customPropertiesMap &&
          artifactObject.customPropertiesMap.length !== 0 ? (
            <ArtifactPropertyDescriptionList
              propertiesMap={artifactObject.customPropertiesMap}
              testId="custom-props-description-list"
            />
          ) : (
            <Content>
              <Content component="small">No custom properties</Content>
            </Content>
          )}
        </Stack>
      </FlexItem>
      {artifactModelData.registeredModelName && (
        <FlexItem data-testid="artifact-registered-model-section">
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3">Registered models</Title>
            </StackItem>
            <StackItem>
              <PipelineRunRegisteredModelDetails artifactModelData={artifactModelData} />
            </StackItem>
          </Stack>
        </FlexItem>
      )}
    </Flex>
  );
};
