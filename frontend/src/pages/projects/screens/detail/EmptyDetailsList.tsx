import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

type EmptyDetailsListProps = {
  title: string;
  description?: string;
  icon?: React.ComponentClass<SVGIconProps>;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({ title, description, icon }) => (
  <EmptyState variant="xs">
    <EmptyStateHeader
      data-testid="empty-state-title"
      titleText={title}
      icon={<EmptyStateIcon icon={icon ?? PlusCircleIcon} />}
      headingLevel="h3"
    />
    <EmptyStateBody>{description}</EmptyStateBody>
  </EmptyState>
);

export default EmptyDetailsList;
