import {
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateBody,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, CubesIcon } from '@patternfly/react-icons';
import React from 'react';

export const NoWorkloadState: React.FC<{ title?: string; subTitle?: string; warn?: boolean }> = ({
  title = 'No distributed workloads',
  subTitle = 'No distributed workloads in the selected project are currently consuming resources.',
  warn = false,
}) => (
  <EmptyState>
    <EmptyStateHeader
      titleText={title}
      headingLevel="h4"
      icon={<EmptyStateIcon icon={warn ? ExclamationTriangleIcon : CubesIcon} />}
    />
    <EmptyStateBody>{subTitle}</EmptyStateBody>
  </EmptyState>
);
