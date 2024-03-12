import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateHeader } from '@patternfly/react-core';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '~/concepts/design/utils';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState variant="xs">
    <EmptyStateHeader
      data-testid="no-model-serving-platform-selected"
      titleText="No model serving platform selected"
      icon={<HeaderIcon type={ProjectObjectType.modelServer} size={54} />}
      headingLevel="h3"
    />
    <EmptyStateBody>
      To enable model serving, an administrator must first select a model serving platform in the
      cluster settings.
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyModelServingPlatform;
