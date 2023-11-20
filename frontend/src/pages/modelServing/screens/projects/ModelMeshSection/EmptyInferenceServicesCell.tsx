import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyInferenceServicesCellProps = {
  onDeployModel: () => void;
};

const EmptyInferenceServicesCell: React.FC<EmptyInferenceServicesCellProps> = ({
  onDeployModel,
}) => (
  <EmptyState>
    <EmptyStateHeader
      titleText="No deployed models"
      icon={<EmptyStateIcon icon={PlusCircleIcon} />}
      headingLevel="h2"
    />
    <EmptyStateFooter>
      <Button variant="primary" onClick={onDeployModel}>
        Deploy model
      </Button>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyInferenceServicesCell;
