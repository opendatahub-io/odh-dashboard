import * as React from 'react';
import { Button, EmptyState, EmptyStateFooter } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyInferenceServicesCellProps = {
  onDeployModel: () => void;
};

const EmptyInferenceServicesCell: React.FC<EmptyInferenceServicesCellProps> = ({
  onDeployModel,
}) => (
  <EmptyState headingLevel="h2" icon={PlusCircleIcon} titleText="No deployed models">
    <EmptyStateFooter>
      <Button variant="primary" onClick={onDeployModel}>
        Deploy model
      </Button>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyInferenceServicesCell;
