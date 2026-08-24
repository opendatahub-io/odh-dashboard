import React from 'react';
import { Content, ContentVariants, Flex, FlexItem, Spinner, Title } from '@patternfly/react-core';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Link } from 'react-router-dom';

type PipelineServerStartingProps = {
  namespace?: string;
  'data-testid'?: string;
};

const PipelineServerStarting: React.FC<PipelineServerStartingProps> = ({
  namespace,
  'data-testid': testId = 'pipeline-server-starting',
}) => (
  <Flex data-testid={testId} justifyContent={{ default: 'justifyContentCenter' }}>
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapMd' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ maxWidth: 'var(--pf-t--global--breakpoint--md)', textAlign: 'center' }}
    >
      <FlexItem>
        <Spinner diameter="80px" />
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h2" size="lg">
          Starting pipeline server
        </Title>
      </FlexItem>
      <FlexItem>
        The pipeline server is being initialized. The process should take less than five minutes.
      </FlexItem>
      {namespace ? (
        <FlexItem>
          <Content component={ContentVariants.a}>
            <Link to={pipelinesBaseRoute(namespace)}>Show details</Link>
          </Content>
        </FlexItem>
      ) : null}
    </Flex>
  </Flex>
);

export default PipelineServerStarting;
