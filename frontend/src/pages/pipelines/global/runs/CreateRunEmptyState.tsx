import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  Title,
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
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title size="lg" headingLevel="h2">
        {title}
      </Title>
      <EmptyStateBody>{description}</EmptyStateBody>
      <EmptyStatePrimary>
        <Button
          variant="primary"
          onClick={() => navigate(`/pipelineRuns/${namespace}/pipelineRun/create`)}
        >
          Create run
        </Button>
      </EmptyStatePrimary>
    </EmptyState>
  );
};

export default CreateRunEmptyState;
