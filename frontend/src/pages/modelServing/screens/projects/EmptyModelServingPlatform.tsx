import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import gearsImg from '~/images/gears.svg';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState variant="xs">
    <EmptyStateHeader
      data-testid="no-model-serving-platform-selected"
      titleText="No model serving platform selected"
      icon={<EmptyStateIcon icon={() => <img src={gearsImg} alt="settings" />} />}
      headingLevel="h3"
    />
    <EmptyStateBody>
      To enable model serving, an administrator must first select a model serving platform in the
      cluster settings.
    </EmptyStateBody>
  </EmptyState>
);

<EmptyDetailsList
  title="No model serving platform selected"
  description="To enable model serving, an administrator must first select a model serving platform in the cluster settings."
  icon={() => <img src={gearsImg} alt="settings" />}
/>;

export default EmptyModelServingPlatform;
