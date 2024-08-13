import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { pipelinesBaseRoute } from '~/routes';

const PipelineNotFound: React.FC = () => {
  const { namespace } = usePipelinesAPI();
  const navigate = useNavigate();
  return (
    <EmptyState>
      <EmptyStateHeader
        titleText="Pipeline version not found"
        icon={<EmptyStateIcon icon={CubesIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>To see more pipelines navigate to the pipelines page</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant="primary" onClick={() => navigate(pipelinesBaseRoute(namespace))}>
            See all pipelines
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};
export default PipelineNotFound;
