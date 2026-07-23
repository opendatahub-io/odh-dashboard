import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
import GearsIcon from './GearsIcon';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState
    headingLevel="h3"
    icon={GearsIcon}
    titleText="No model serving platform selected"
    variant="xs"
  >
    <EmptyStateBody>
      To enable model serving, an administrator must first select a model serving platform in the
      cluster settings.
    </EmptyStateBody>
    <EmptyStateFooter>
      <WhosMyAdministrator />
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyModelServingPlatform;
