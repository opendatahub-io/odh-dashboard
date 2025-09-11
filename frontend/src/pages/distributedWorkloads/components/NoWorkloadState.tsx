import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationTriangleIcon, CubesIcon } from '@patternfly/react-icons';
import React from 'react';

export const NoWorkloadState: React.FC<{ title?: string; subTitle?: string; warn?: boolean }> = ({
  title = 'No workload metrics',
  subTitle = 'No workload metrics in the selected project are currently consuming resources.',
  warn = false,
}) => (
  <EmptyState headingLevel="h4" icon={warn ? ExclamationTriangleIcon : CubesIcon} titleText={title}>
    <EmptyStateBody>{subTitle}</EmptyStateBody>
  </EmptyState>
);
