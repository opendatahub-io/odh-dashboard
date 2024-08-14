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
import { ArtifactUriLink } from '~/concepts/pipelines/content/artifacts/ArtifactUriLink';
import { ArtifactPropertyDescriptionList } from './ArtifactPropertyDescriptionList';

interface ArtifactOverviewDetailsProps {
  artifact: Artifact | undefined;
}

export const ArtifactOverviewDetails: React.FC<ArtifactOverviewDetailsProps> = ({ artifact }) => {
  const artifactObject = artifact?.toObject();
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

      {!!artifactObject?.propertiesMap.length && (
        <FlexItem>
          <Stack hasGutter>
            <Title headingLevel="h3">Properties</Title>
            <ArtifactPropertyDescriptionList
              propertiesMap={artifactObject.propertiesMap}
              testId="props-description-list"
            />
          </Stack>
        </FlexItem>
      )}

      {!!artifactObject?.customPropertiesMap.length && (
        <FlexItem>
          <Stack hasGutter>
            <Title headingLevel="h3">Custom properties</Title>
            <ArtifactPropertyDescriptionList
              propertiesMap={artifactObject.customPropertiesMap}
              testId="custom-props-description-list"
            />
          </Stack>
        </FlexItem>
      )}
    </Flex>
  );
};
