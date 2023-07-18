import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
const PipelineNotFound: React.FC = () => {
  const { namespace } = usePipelinesAPI();
  const navigate = useNavigate();
  return (
    <EmptyState>
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h4" size="lg">
        Pipeline not found
      </Title>
      <EmptyStateBody>To see more pipelines navigate to the pipelines page</EmptyStateBody>
      <EmptyStatePrimary>
        <Button variant="primary" onClick={() => navigate(`/pipelines/${namespace}`)}>
          See all pipelines
        </Button>
      </EmptyStatePrimary>
    </EmptyState>
  );
};
export default PipelineNotFound;
