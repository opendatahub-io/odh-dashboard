import React from 'react';
import { Link } from 'react-router-dom';

import {
  Title,
  Flex,
  FlexItem,
  Stack,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';

import { Artifact } from '~/third_party/mlmd';
import { artifactsDetailsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getArtifactName } from '~/pages/pipelines/global/experiments/artifacts/utils';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ArtifactUriLink } from '~/concepts/pipelines/content/artifacts/ArtifactUriLink';

type ArtifactNodeDetailsProps = Pick<
  React.ComponentProps<typeof PipelineRunDrawerRightContent>,
  'upstreamTaskName'
> & {
  artifact: Artifact;
};

export const ArtifactNodeDetails: React.FC<ArtifactNodeDetailsProps> = ({
  artifact,
  upstreamTaskName,
}) => {
  const { namespace } = usePipelinesAPI();
  const artifactName = getArtifactName(artifact);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  return (
    <Flex
      spaceItems={{ default: 'spaceItems2xl' }}
      direction={{ default: 'column' }}
      className="pf-v5-u-pt-lg pf-v5-u-pb-lg"
    >
      <FlexItem>
        <Stack hasGutter>
          <Title headingLevel="h3">Artifact details</Title>
          <DescriptionList
            isHorizontal
            horizontalTermWidthModifier={{ default: '15ch' }}
            data-testid="artifact-details-description-list"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Upstream task</DescriptionListTerm>
              <DescriptionListDescription>{upstreamTaskName}</DescriptionListDescription>

              <DescriptionListTerm>Artifact name</DescriptionListTerm>
              <DescriptionListDescription>
                {isExperimentsAvailable ? (
                  <Link to={artifactsDetailsRoute(namespace, artifact.getId())}>
                    {artifactName}
                  </Link>
                ) : (
                  artifactName
                )}
              </DescriptionListDescription>

              <DescriptionListTerm>Artifact type</DescriptionListTerm>
              <DescriptionListDescription>{artifact.getType()}</DescriptionListDescription>

              <DescriptionListTerm>Created at</DescriptionListTerm>
              <DescriptionListDescription>
                <PipelinesTableRowTime date={new Date(artifact.getCreateTimeSinceEpoch())} />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </Stack>
      </FlexItem>

      <FlexItem>
        <Stack hasGutter>
          <Title headingLevel="h3">Artifact URI</Title>
          <DescriptionList
            isHorizontal
            horizontalTermWidthModifier={{ default: '15ch' }}
            data-testid="artifact-uri-description-list"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>{artifactName}</DescriptionListTerm>
              <DescriptionListDescription>
                <ArtifactUriLink artifact={artifact} />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </Stack>
      </FlexItem>
    </Flex>
  );
};
