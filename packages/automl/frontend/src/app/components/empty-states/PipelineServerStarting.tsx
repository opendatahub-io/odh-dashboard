import React from 'react';
import { Content, ContentVariants, Flex, FlexItem, Spinner, Title } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

type PipelineServerStartingProps = {
  namespace?: string;
  'data-testid'?: string;
};

const PipelineServerStarting: React.FC<PipelineServerStartingProps> = ({
  namespace,
  'data-testid': testId = 'pipeline-server-starting',
}) => (
  <div data-testid={testId} className="pf-v6-u-display-flex pf-v6-u-justify-content-center">
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapMd' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ textAlign: 'center', maxWidth: '600px' }}
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
            <Link to={`/projects/${namespace}?section=pipelines-projects`}>Show details</Link>
          </Content>
        </FlexItem>
      ) : null}
    </Flex>
  </div>
);

export default PipelineServerStarting;
