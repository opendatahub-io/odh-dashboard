import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';

type EmptyDetailsListProps = {
  variant?: React.ComponentProps<typeof EmptyState>['variant'];
  title?: string;
  description?: string;
  icon?: React.ComponentType;
  actions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({
  variant,
  title,
  description,
  icon,
  actions,
  secondaryActions,
}) => (
  <EmptyState headingLevel="h3" titleText={title} isFullHeight variant={variant} icon={icon}>
    <EmptyStateBody>{description}</EmptyStateBody>
    {actions || secondaryActions ? (
      <EmptyStateFooter>
        {actions ? <EmptyStateActions>{actions}</EmptyStateActions> : null}
        {secondaryActions ? <EmptyStateActions>{secondaryActions}</EmptyStateActions> : null}
      </EmptyStateFooter>
    ) : null}
  </EmptyState>
);

export default EmptyDetailsList;
