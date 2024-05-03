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
} from '@patternfly/react-core';

import { Artifact } from '~/third_party/mlmd';
import { usePipelinesUiRoute } from '~/concepts/pipelines/context/usePipelinesUiRoute';
import { ArtifactUriLink } from '~/pages/pipelines/global/experiments/artifacts/ArtifactUriLink';
import { ArtifactPropertyDescriptionList } from './ArtifactPropertyDescriptionList';

interface ArtifactOverviewDetailsProps {
  artifact: Artifact.AsObject | undefined;
}

export const ArtifactOverviewDetails: React.FC<ArtifactOverviewDetailsProps> = ({ artifact }) => {
  const [pipelinesUiRoute, isPipelinesUiRouteLoaded] = usePipelinesUiRoute();

  return (
    <Flex
      spaceItems={{ default: 'spaceItems2xl' }}
      direction={{ default: 'column' }}
      className="pf-v5-u-pt-lg pf-v5-u-pb-lg"
    >
      <FlexItem>
        <Stack hasGutter>
          <Title headingLevel="h3">Live system dataset</Title>
          <DescriptionList isHorizontal data-testid="dataset-description-list">
            <DescriptionListGroup>
              {artifact?.uri && (
                <>
                  <DescriptionListTerm>URI</DescriptionListTerm>
                  <DescriptionListDescription>
                    <ArtifactUriLink
                      uri={artifact.uri}
                      downloadHost={pipelinesUiRoute}
                      isLoaded={isPipelinesUiRouteLoaded}
                    />
                  </DescriptionListDescription>
                </>
              )}
            </DescriptionListGroup>
          </DescriptionList>
        </Stack>
      </FlexItem>

      {!!artifact?.propertiesMap.length && (
        <FlexItem>
          <Stack hasGutter>
            <Title headingLevel="h3">Properties</Title>
            <ArtifactPropertyDescriptionList
              propertiesMap={artifact.propertiesMap}
              testId="props-description-list"
            />
          </Stack>
        </FlexItem>
      )}

      {!!artifact?.customPropertiesMap.length && (
        <FlexItem>
          <Stack hasGutter>
            <Title headingLevel="h3">Custom properties</Title>
            <ArtifactPropertyDescriptionList
              propertiesMap={artifact.customPropertiesMap}
              testId="custom-props-description-list"
            />
          </Stack>
        </FlexItem>
      )}
    </Flex>
  );
};
