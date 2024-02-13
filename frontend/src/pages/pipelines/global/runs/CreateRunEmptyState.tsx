import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type CreateRunEmptyStateProps = {
  title: string;
  description: string;
};

const CreateRunEmptyState: React.FC<CreateRunEmptyStateProps> = ({ title, description }) => {
  const { namespace } = usePipelinesAPI();
  const navigate = useNavigate();

  return (
    <EmptyState data-testid="create-run-empty-state">
      <EmptyStateHeader
        titleText={<>{title}</>}
        icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>{description}</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => navigate(`/pipelineRuns/${namespace}/pipelineRun/create`)}
          >
            Create run
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default CreateRunEmptyState;
