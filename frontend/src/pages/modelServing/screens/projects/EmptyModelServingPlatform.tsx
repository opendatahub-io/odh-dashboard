import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import gearsImg from '~/images/gears.svg';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState
    headingLevel="h3"
    icon={() => <img src={gearsImg} alt="settings" />}
    titleText="No model serving platform selected"
    variant="xs"
  >
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
