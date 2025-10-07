import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const EmptyCustomServingRuntime: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState headingLevel="h2" icon={PlusCircleIcon} titleText="No custom serving runtimes.">
      <EmptyStateBody>To get started, create a new serving runtime.</EmptyStateBody>
      <EmptyStateFooter>
        <Button
          data-testid="add-serving-runtime-button"
          onClick={() => navigate('/settings/model-resources-operations/serving-runtimes/add')}
        >
          Add serving runtime
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyCustomServingRuntime;
