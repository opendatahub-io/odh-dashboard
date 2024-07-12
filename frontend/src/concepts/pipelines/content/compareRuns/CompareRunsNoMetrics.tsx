import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateBody,
} from '@patternfly/react-core';
import React from 'react';

type CompareRunsNoMetricsProps = Omit<React.ComponentProps<typeof EmptyState>, 'children'> & {
  title?: string;
};

export const CompareRunsNoMetrics: React.FC<CompareRunsNoMetricsProps> = ({
  title = 'No metrics to compare',
  ...props
}) => (
  <EmptyState variant={EmptyStateVariant.xs} {...props}>
    <EmptyStateHeader titleText={title} headingLevel="h4" />
    <EmptyStateBody>
      The selected runs do not contain relevant metrics. Select different runs to compare.
    </EmptyStateBody>
  </EmptyState>
);
