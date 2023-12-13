import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState variant="xs">
    <EmptyStateHeader
      titleText="No model serving platform selected"
      icon={<EmptyStateIcon icon={WrenchIcon} />}
      headingLevel="h3"
    />
    <EmptyStateBody>
      To enable model serving, an administrator must first select a model serving platform in the
      cluster settings.
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyModelServingPlatform;
