import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateBody,
} from '@patternfly/react-core';
import React from 'react';

type CompareRunsEmptyStateProps = Omit<React.ComponentProps<typeof EmptyState>, 'children'> & {
  title?: string;
};

export const CompareRunsEmptyState: React.FC<CompareRunsEmptyStateProps> = ({
  title = 'No runs selected',
  ...props
}) => (
  <EmptyState variant={EmptyStateVariant.xs} {...props}>
    <EmptyStateHeader titleText={title} headingLevel="h4" />
    <EmptyStateBody>
      Select runs from the <b>Run list</b> to compare parameters.
    </EmptyStateBody>
  </EmptyState>
);
