import { EmptyState, EmptyStateVariant, EmptyStateBody } from '@patternfly/react-core';
import React from 'react';

type CompareRunsEmptyStateProps = Omit<React.ComponentProps<typeof EmptyState>, 'children'> & {
  title?: string;
};

export const CompareRunsEmptyState: React.FC<CompareRunsEmptyStateProps> = ({
  title = 'No runs selected',
  ...props
}) => (
  <EmptyState headingLevel="h4" titleText={title} variant={EmptyStateVariant.xs} {...props}>
    <EmptyStateBody>
      Select runs from the <b>Run list</b> to compare parameters.
    </EmptyStateBody>
  </EmptyState>
);
