import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import gearsImg from '~/images/gears.svg';
import WhosMyAdministrator from '~/components/WhosMyAdministrator';

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
    <EmptyStateFooter>
      <WhosMyAdministrator />
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyModelServingPlatform;
