import { EmptyState, EmptyStateVariant, EmptyStateBody } from '@patternfly/react-core';
import React from 'react';

type CompareRunsNoMetricsProps = Omit<React.ComponentProps<typeof EmptyState>, 'children'> & {
  title?: string;
};

export const CompareRunsNoMetrics: React.FC<CompareRunsNoMetricsProps> = ({
  title = 'No metrics to compare',
  ...props
}) => (
  <EmptyState headingLevel="h4" titleText={title} variant={EmptyStateVariant.xs} {...props}>
    <EmptyStateBody>
      The selected runs do not contain relevant metrics. Select different runs to compare.
    </EmptyStateBody>
  </EmptyState>
);
