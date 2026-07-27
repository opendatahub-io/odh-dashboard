import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- wrapper re-export that injects host-specific error handling
import ErrorOverviewCardBase from '@odh-dashboard/ui-core/components/detail/ErrorOverviewCard';
import type { OverviewCardProps } from '@odh-dashboard/ui-core/components/detail/OverviewCard';
import { getGenericErrorCode } from '#~/api/errorUtils';

type ErrorOverviewCardProps = {
  error: Error;
} & Omit<OverviewCardProps, 'children' | 'data-testid'>;

const ErrorOverviewCard: React.FC<ErrorOverviewCardProps> = ({ error, ...props }) => (
  <ErrorOverviewCardBase
    error={error}
    isUnauthorized={getGenericErrorCode(error) === 403}
    {...props}
  />
);

export default ErrorOverviewCard;
