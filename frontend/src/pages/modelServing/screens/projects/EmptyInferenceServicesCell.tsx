import * as React from 'react';
import { Button, EmptyState, Title, EmptyStateIcon } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyInferenceServicesCellProps = {
  onDeployModel: () => void;
};

const EmptyInferenceServicesCell: React.FC<EmptyInferenceServicesCellProps> = ({
  onDeployModel,
}) => (
  <EmptyState>
    <EmptyStateIcon icon={PlusCircleIcon} />
    <Title headingLevel="h4" size="lg">
      No deployed models
    </Title>
    <Button variant="primary" onClick={onDeployModel}>
      Deploy model
    </Button>
  </EmptyState>
);

export default EmptyInferenceServicesCell;
