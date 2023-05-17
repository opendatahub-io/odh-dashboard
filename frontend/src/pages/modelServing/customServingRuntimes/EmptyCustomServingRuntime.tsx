import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const EmptyCustomServingRuntime: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h2" size="lg">
        No custom serving runtimes.
      </Title>
      <EmptyStateBody>To get started, create a new serving runtime.</EmptyStateBody>
      <Button onClick={() => navigate('/servingRuntimes/addServingRuntime')}>
        Add serving runtime
      </Button>
    </EmptyState>
  );
};

export default EmptyCustomServingRuntime;
