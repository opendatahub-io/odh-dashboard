import React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Stack,
  Title,
} from '@patternfly/react-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ArtifactKF } from '#~/concepts/pipelines/kfTypes';
import PipelineRunRegisteredModelDetails from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunRegisteredModelDetails';
import {
  getIsArtifactResourceModelRegistered,
  getRegisteredModelData,
} from '#~/pages/pipelines/global/experiments/artifacts/artifactResourceUtils';
import { ArtifactMetadataDescriptionList } from './ArtifactMetadataDescriptionList';

type ArtifactOverviewDetailsProps = {
  artifact: ArtifactKF | undefined;
};

export const ArtifactOverviewDetails: React.FC<ArtifactOverviewDetailsProps> = ({ artifact }) => {
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const artifactModelData = getRegisteredModelData(artifact);
  const metadata = artifact?.metadata;

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
              <DescriptionListTerm data-testid="dataset-description-list-URI">
                URI
              </DescriptionListTerm>
              <DescriptionListDescription>{artifact?.uri || '—'}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </Stack>
      </FlexItem>
      <FlexItem data-testid="artifact-metadata-section">
        <Stack hasGutter>
          <Title headingLevel="h3">Metadata</Title>
          {metadata && Object.keys(metadata).length > 0 ? (
            <ArtifactMetadataDescriptionList metadata={metadata} />
          ) : (
            <Content component="small">No metadata</Content>
          )}
        </Stack>
      </FlexItem>
      {modelRegistryAvailable && getIsArtifactResourceModelRegistered(artifact) && (
        <FlexItem data-testid="artifact-registered-model-section">
          <Stack hasGutter>
            <Title headingLevel="h3">Registered models</Title>
            <PipelineRunRegisteredModelDetails artifactModelData={artifactModelData} />
          </Stack>
        </FlexItem>
      )}
    </Flex>
  );
};
