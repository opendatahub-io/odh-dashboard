import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const EmptyCustomServingRuntime: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState>
      <EmptyStateHeader
        titleText="No custom serving runtimes."
        icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>To get started, create a new serving runtime.</EmptyStateBody>
      <EmptyStateFooter>
        <Button
          data-testid="add-serving-runtime-button"
          onClick={() => navigate('/servingRuntimes/addServingRuntime')}
        >
          Add serving runtime
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyCustomServingRuntime;
